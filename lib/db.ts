import { nanoid } from 'nanoid';
import { StudySet, StudyItem, UserProgress } from './types';
import { query, setupDatabase } from './neon-db';
import { createLocalStorageClient } from './local-db';

// Initialize database tables
export async function initDb() {
  // Only run if we have a database URL
  if (process.env.DATABASE_URL) {
    return setupDatabase();
  }
  return { success: false, error: 'No DATABASE_URL provided' };
}

// Check if we have a database connection
const hasDatabase = typeof process !== 'undefined' && !!process.env.DATABASE_URL;

// Create local DB fallback
const localDb = createLocalStorageClient();

// Implementation functions - will be conditionally exported
async function createStudySetDb(data: Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudySet> {
  const id = nanoid();
  const now = Date.now();
  
  const studySet: StudySet = {
    id,
    createdAt: now,
    updatedAt: now,
    ...data
  };
  
  try {
    // Insert into study_sets table
    await query(
      `INSERT INTO study_sets (id, title, description, created_at, updated_at, source_type, source_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id, 
        studySet.title, 
        studySet.description || '', 
        studySet.createdAt, 
        studySet.updatedAt, 
        studySet.sourceType,
        studySet.sourceName || null
      ]
    );
    
    // Insert each study item
    for (const item of studySet.items) {
      await query(
        `INSERT INTO study_items (id, study_set_id, term, definition, options, correct_answer) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          item.id, 
          id, 
          item.term, 
          item.definition, 
          item.options || null, 
          item.correctAnswer || null
        ]
      );
    }
    
    return studySet;
  } catch (error) {
    console.error('Error creating study set:', error);
    throw error;
  }
}

async function getStudySetDb(id: string): Promise<StudySet | null> {
  try {
    // Get the study set
    const studySetResult = await query(
      `SELECT * FROM study_sets WHERE id = $1`,
      [id]
    );
    
    if (studySetResult.rowCount === 0) {
      return null;
    }
    
    const studySetRow = studySetResult.rows[0];
    
    // Get all items for this study set
    const itemsResult = await query(
      `SELECT * FROM study_items WHERE study_set_id = $1`,
      [id]
    );
    
    // Convert from DB format to our StudySet type
    const studySet: StudySet = {
      id: studySetRow.id,
      title: studySetRow.title,
      description: studySetRow.description,
      createdAt: Number(studySetRow.created_at),
      updatedAt: Number(studySetRow.updated_at),
      sourceType: studySetRow.source_type as 'pdf' | 'manual' | 'ai-generated',
      sourceName: studySetRow.source_name,
      items: itemsResult.rows.map(row => ({
        id: row.id,
        term: row.term,
        definition: row.definition,
        options: row.options,
        correctAnswer: row.correct_answer
      }))
    };
    
    return studySet;
  } catch (error) {
    console.error('Error getting study set:', error);
    return null;
  }
}

async function updateStudySetDb(id: string, data: Partial<Omit<StudySet, 'id' | 'createdAt'>>): Promise<StudySet | null> {
  try {
    // Get the existing study set
    const existingStudySet = await getStudySet(id);
    
    if (!existingStudySet) {
      return null;
    }
    
    const now = Date.now();
    
    // Update the study set
    await query(
      `UPDATE study_sets 
       SET title = $1, description = $2, updated_at = $3, source_type = $4, source_name = $5
       WHERE id = $6`,
      [
        data.title || existingStudySet.title,
        data.description ?? existingStudySet.description,
        now,
        data.sourceType || existingStudySet.sourceType,
        data.sourceName ?? existingStudySet.sourceName,
        id
      ]
    );
    
    // If we have updated items, handle them
    if (data.items) {
      // Delete existing items
      await query(`DELETE FROM study_items WHERE study_set_id = $1`, [id]);
      
      // Insert new items
      for (const item of data.items) {
        await query(
          `INSERT INTO study_items (id, study_set_id, term, definition, options, correct_answer) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.id, 
            id, 
            item.term, 
            item.definition, 
            item.options || null, 
            item.correctAnswer || null
          ]
        );
      }
    }
    
    // Get the updated study set
    return getStudySet(id);
  } catch (error) {
    console.error('Error updating study set:', error);
    return null;
  }
}

async function deleteStudySetDb(id: string): Promise<boolean> {
  try {
    // The foreign key constraints will automatically delete study items
    const result = await query(`DELETE FROM study_sets WHERE id = $1`, [id]);
    
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting study set:', error);
    return false;
  }
}

async function getAllStudySetsDb(): Promise<StudySet[]> {
  try {
    // Get all study sets
    const studySetsResult = await query(`SELECT * FROM study_sets ORDER BY updated_at DESC`);
    
    const studySetRows = studySetsResult.rows;
    
    // For each study set, get its items
    const studySets: StudySet[] = await Promise.all(
      studySetRows.map(async (row) => {
        const itemsResult = await query(
          `SELECT * FROM study_items WHERE study_set_id = $1`,
          [row.id]
        );
        
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          createdAt: Number(row.created_at),
          updatedAt: Number(row.updated_at),
          sourceType: row.source_type as 'pdf' | 'manual' | 'ai-generated',
          sourceName: row.source_name,
          items: itemsResult.rows.map(itemRow => ({
            id: itemRow.id,
            term: itemRow.term,
            definition: itemRow.definition,
            options: itemRow.options,
            correctAnswer: itemRow.correct_answer
          }))
        };
      })
    );
    
    return studySets;
  } catch (error) {
    console.error('Error getting all study sets:', error);
    return [];
  }
}

async function saveUserProgressDb(progress: Omit<UserProgress, 'updatedAt'>): Promise<UserProgress> {
  const now = Date.now();
  
  const userProgress: UserProgress = {
    ...progress,
    updatedAt: now
  };
  
  try {
    // Try to update first (if exists)
    const updateResult = await query(
      `UPDATE user_progress 
       SET updated_at = $1, items_studied = $2, correct_answers = $3, incorrect_answers = $4, completed_sessions = $5
       WHERE study_set_id = $6 AND mode = $7
       RETURNING *`,
      [
        now,
        userProgress.itemsStudied,
        userProgress.correctAnswers,
        userProgress.incorrectAnswers,
        userProgress.completedSessions,
        userProgress.studySetId,
        userProgress.mode
      ]
    );
    
    // If no rows were updated, insert
    if (updateResult.rowCount === 0) {
      await query(
        `INSERT INTO user_progress (study_set_id, mode, updated_at, items_studied, correct_answers, incorrect_answers, completed_sessions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userProgress.studySetId,
          userProgress.mode,
          now,
          userProgress.itemsStudied,
          userProgress.correctAnswers,
          userProgress.incorrectAnswers,
          userProgress.completedSessions
        ]
      );
    }
    
    return userProgress;
  } catch (error) {
    console.error('Error saving user progress:', error);
    return userProgress;
  }
}

async function getUserProgressDb(studySetId: string, mode: string): Promise<UserProgress | null> {
  try {
    const result = await query(
      `SELECT * FROM user_progress WHERE study_set_id = $1 AND mode = $2`,
      [studySetId, mode]
    );
    
    if (result.rowCount === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      studySetId: row.study_set_id,
      mode: row.mode,
      updatedAt: Number(row.updated_at),
      itemsStudied: row.items_studied,
      correctAnswers: row.correct_answers,
      incorrectAnswers: row.incorrect_answers,
      completedSessions: row.completed_sessions
    };
  } catch (error) {
    console.error('Error getting user progress:', error);
    return null;
  }
}

// Export the functions with fallback to localStorage when no database is available
export const createStudySet = hasDatabase ? createStudySetDb : localDb.createStudySet;
export const getStudySet = hasDatabase ? getStudySetDb : localDb.getStudySet;
export const updateStudySet = hasDatabase ? updateStudySetDb : localDb.updateStudySet;
export const deleteStudySet = hasDatabase ? deleteStudySetDb : localDb.deleteStudySet;
export const getAllStudySets = hasDatabase ? getAllStudySetsDb : localDb.getAllStudySets;
export const saveUserProgress = hasDatabase ? saveUserProgressDb : localDb.saveUserProgress;
export const getUserProgress = hasDatabase ? getUserProgressDb : localDb.getUserProgress;
