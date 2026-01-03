/**
 * Audit Logger Utility
 * Creates audit log entries for entity changes
 */

const AuditLog = require("../models/AuditLog");

const auditLogger = {
  /**
   * Log an entity change
   * @param {string} userId - User performing the action
   * @param {string} action - Action type (CREATE_PRODUCT, UPDATE_PRODUCT, etc.)
   * @param {string} entityType - Entity type (product, sale, profile, inventory)
   * @param {string} entityId - Entity ID
   * @param {Object} before - State before change (null for create)
   * @param {Object} after - State after change (null for delete)
   */
  log: async (
    userId,
    action,
    entityType,
    entityId,
    before = null,
    after = null
  ) => {
    try {
      const logEntry = new AuditLog({
        userId,
        action,
        entityType,
        entityId,
        before: before ? JSON.parse(JSON.stringify(before)) : null,
        after: after ? JSON.parse(JSON.stringify(after)) : null,
        timestamp: new Date(),
      });

      await logEntry.save();
      return logEntry;
    } catch (error) {
      console.error("Audit log error:", error);
      // Don't throw - audit logging should not break main operations
      return null;
    }
  },

  /**
   * Get audit logs for a specific entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<Array>}
   */
  getLogsForEntity: async (entityType, entityId) => {
    try {
      return await AuditLog.find({ entityType, entityId })
        .sort({ timestamp: -1 })
        .limit(50);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return [];
    }
  },

  /**
   * Get audit logs for a user
   * @param {string} userId - User ID
   * @param {number} limit - Max results
   * @returns {Promise<Array>}
   */
  getLogsForUser: async (userId, limit = 50) => {
    try {
      return await AuditLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      return [];
    }
  },
};

module.exports = auditLogger;
