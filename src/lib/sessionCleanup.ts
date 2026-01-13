import { cleanupExpiredSessions } from '@/lib/auth';

// Cleanup expired sessions - run this periodically
export const sessionCleanupJob = async () => {
  try {
    console.log('🧹 Starting session cleanup job...');
    
    const result = await cleanupExpiredSessions();
    
    console.log(`✅ Session cleanup completed. Removed expired sessions.`);
    
    return result;
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
    throw error;
  }
};

// Schedule cleanup job to run every hour
export const scheduleSessionCleanup = () => {
  // Run immediately on startup
  setTimeout(sessionCleanupJob, 5000);
  
  // Then run every hour
  setInterval(sessionCleanupJob, 60 * 60 * 1000);
  
  console.log('🕐 Session cleanup job scheduled to run every hour');
};

// Export for manual triggering if needed
export { sessionCleanupJob as cleanupSessions };
