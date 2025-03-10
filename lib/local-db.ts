import { nanoid } from 'nanoid';
import { StudySet, StudyItem, UserProgress } from './types';

/**
 * Create a localStorage-based client for storing data
 * This is used as a fallback when no database connection is available
 */
export function createLocalStorageClient() {
  // In-memory store for server-side and initial rendering
  const memoryStore = {
    studySets: new Map<string, StudySet>(),
    studySetIds: [] as string[],
    progress: new Map<string, UserProgress>(),
  };

  const isClient = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  function initializeFromLocalStorage(): void {
    if (!isClient()) return;
    
    try {
      console.log('[LocalDB] Initializing from localStorage');
      
      // Get all keys that start with "study-set:"
      const studySetKeys = Object.keys(localStorage).filter(key => key.startsWith('study-set:'));
      
      // Load study sets from localStorage
      studySetKeys.forEach(key => {
        const studySetStr = localStorage.getItem(key);
        if (studySetStr) {
          try {
            const studySet = JSON.parse(studySetStr);
            memoryStore.studySets.set(studySet.id, studySet);
            if (!memoryStore.studySetIds.includes(studySet.id)) {
              memoryStore.studySetIds.push(studySet.id);
            }
          } catch (e) {
            console.error('Error parsing study set JSON:', e);
          }
        }
      });
      
      // Get the all study sets index if it exists
      const allSetsIdsStr = localStorage.getItem('study-sets:all');
      if (allSetsIdsStr) {
        try {
          const allSetsIds = JSON.parse(allSetsIdsStr);
          if (Array.isArray(allSetsIds)) {
            // Make sure all these IDs are in our memory store IDs list
            allSetsIds.forEach(id => {
              if (!memoryStore.studySetIds.includes(id)) {
                memoryStore.studySetIds.push(id);
              }
            });
          }
        } catch (e) {
          console.error('Error parsing all sets IDs:', e);
        }
      }
      
      // Get all keys that start with "progress:"
      const progressKeys = Object.keys(localStorage).filter(key => key.startsWith('progress:'));
      
      // Load progress from localStorage
      progressKeys.forEach(key => {
        const progressStr = localStorage.getItem(key);
        if (progressStr) {
          try {
            const progress = JSON.parse(progressStr);
            memoryStore.progress.set(key, progress);
          } catch (e) {
            console.error('Error parsing progress JSON:', e);
          }
        }
      });
      
      console.log(`[LocalDB] Loaded ${memoryStore.studySets.size} study sets`);
    } catch (error) {
      console.error('Error initializing from localStorage:', error);
    }
  }

  async function createStudySet(data: Omit<StudySet, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudySet> {
    console.log('[LocalDB] Creating study set:', data.title);
    
    const id = nanoid();
    const now = Date.now();
    
    const studySet: StudySet = {
      id,
      createdAt: now,
      updatedAt: now,
      ...data
    };
    
    // Always update the in-memory store
    memoryStore.studySets.set(id, studySet);
    if (!memoryStore.studySetIds.includes(id)) {
      memoryStore.studySetIds.push(id);
    }
    
    // If we're on the client, also save to localStorage
    if (isClient()) {
      try {
        localStorage.setItem(`study-set:${id}`, JSON.stringify(studySet));
        
        // Update the index of all study sets
        localStorage.setItem('study-sets:all', JSON.stringify(memoryStore.studySetIds));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
    
    return studySet;
  }

  async function getStudySet(id: string): Promise<StudySet | null> {
    initializeFromLocalStorage();
    
    // First check the in-memory store
    if (memoryStore.studySets.has(id)) {
      console.log(`[LocalDB] Found study set in memory: ${id}`);
      return memoryStore.studySets.get(id) || null;
    }
    
    // If we're on the client, try to get from localStorage
    if (isClient()) {
      try {
        const studySetStr = localStorage.getItem(`study-set:${id}`);
        if (studySetStr) {
          console.log(`[LocalDB] Found study set in localStorage: ${id}`);
          const studySet = JSON.parse(studySetStr);
          
          // Update the in-memory store
          memoryStore.studySets.set(id, studySet);
          
          return studySet;
        }
      } catch (error) {
        console.error('Error reading from localStorage:', error);
      }
    }
    
    console.log(`[LocalDB] Study set not found: ${id}`);
    return null;
  }

  async function updateStudySet(id: string, data: Partial<Omit<StudySet, 'id' | 'createdAt'>>): Promise<StudySet | null> {
    initializeFromLocalStorage();
    
    // Get the existing study set
    const existingSet = await getStudySet(id);
    if (!existingSet) {
      return null;
    }
    
    const updatedSet: StudySet = {
      ...existingSet,
      ...data,
      updatedAt: Date.now()
    };
    
    // Update the in-memory store
    memoryStore.studySets.set(id, updatedSet);
    
    // If we're on the client, also update localStorage
    if (isClient()) {
      try {
        localStorage.setItem(`study-set:${id}`, JSON.stringify(updatedSet));
      } catch (error) {
        console.error('Error updating localStorage:', error);
      }
    }
    
    return updatedSet;
  }

  async function deleteStudySet(id: string): Promise<boolean> {
    initializeFromLocalStorage();
    
    // Check if the study set exists
    if (!memoryStore.studySets.has(id)) {
      return false;
    }
    
    // Delete from in-memory store
    memoryStore.studySets.delete(id);
    memoryStore.studySetIds = memoryStore.studySetIds.filter(setId => setId !== id);
    
    // If we're on the client, also delete from localStorage
    if (isClient()) {
      try {
        localStorage.removeItem(`study-set:${id}`);
        localStorage.setItem('study-sets:all', JSON.stringify(memoryStore.studySetIds));
      } catch (error) {
        console.error('Error deleting from localStorage:', error);
      }
    }
    
    return true;
  }

  async function getAllStudySets(): Promise<StudySet[]> {
    initializeFromLocalStorage();
    console.log(`[LocalDB] Returning ${memoryStore.studySets.size} study sets`);
    
    // Return all study sets from the in-memory store
    return Array.from(memoryStore.studySets.values());
  }

  async function saveUserProgress(progress: Omit<UserProgress, 'updatedAt'>): Promise<UserProgress> {
    initializeFromLocalStorage();
    
    const now = Date.now();
    
    const userProgress: UserProgress = {
      ...progress,
      updatedAt: now
    };
    
    const key = `progress:${progress.studySetId}:${progress.mode}`;
    
    // Update the in-memory store
    memoryStore.progress.set(key, userProgress);
    
    // If we're on the client, also save to localStorage
    if (isClient()) {
      try {
        localStorage.setItem(key, JSON.stringify(userProgress));
      } catch (error) {
        console.error('Error saving progress to localStorage:', error);
      }
    }
    
    return userProgress;
  }

  async function getUserProgress(studySetId: string, mode: string): Promise<UserProgress | null> {
    initializeFromLocalStorage();
    
    const key = `progress:${studySetId}:${mode}`;
    
    // First check the in-memory store
    if (memoryStore.progress.has(key)) {
      return memoryStore.progress.get(key) || null;
    }
    
    // If we're on the client, try to get from localStorage
    if (isClient()) {
      try {
        const progressStr = localStorage.getItem(key);
        if (progressStr) {
          const progress = JSON.parse(progressStr);
          
          // Update the in-memory store
          memoryStore.progress.set(key, progress);
          
          return progress;
        }
      } catch (error) {
        console.error('Error reading progress from localStorage:', error);
      }
    }
    
    return null;
  }

  return {
    createStudySet,
    getStudySet,
    updateStudySet,
    deleteStudySet,
    getAllStudySets,
    saveUserProgress,
    getUserProgress
  };
}
