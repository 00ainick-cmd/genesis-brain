/**
 * GENESIS Integration for Clawdbot
 * Add this to your Clawdbot Telegram bot to enable GENESIS features
 *
 * Usage in Clawdbot:
 *   const genesis = require('./clawdbot-integration');
 *
 *   // In your message handler:
 *   if (text.startsWith('/add ')) {
 *     const result = await genesis.capture(text.replace('/add ', ''));
 *     bot.sendMessage(chatId, result.message);
 *   }
 */

const GENESIS_URL = process.env.GENESIS_URL || 'http://localhost:4000';
const GENESIS_API_KEY = process.env.GENESIS_API_KEY;

async function apiCall(endpoint, method = 'GET', body = null) {
  const fetch = (await import('node-fetch')).default;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Genesis-API-Key': GENESIS_API_KEY
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${GENESIS_URL}/api/v1/clawdbot${endpoint}`, options);
  return response.json();
}

// =====================================================
// CLAWDBOT COMMANDS
// =====================================================

/**
 * Quick capture to inbox
 * /add Buy milk
 */
async function capture(text, type = 'inbox') {
  return apiCall('/capture', 'POST', { text, type });
}

/**
 * Get dashboard summary
 * /status or /dashboard
 */
async function dashboard() {
  const data = await apiCall('/dashboard');

  if (data.error) return data;

  const { summary, topActions } = data;

  let message = `🎮 *GENESIS Dashboard*\n\n`;
  message += `📥 Inbox: ${summary.inbox}\n`;
  message += `⚡ Next Actions: ${summary.nextActions}\n`;
  message += `⏳ Waiting: ${summary.waiting}\n`;
  message += `📁 Active Projects: ${summary.activeProjects}\n`;

  if (summary.overdue > 0) {
    message += `\n⚠️ *${summary.overdue} overdue items!*\n`;
  }

  if (topActions.length > 0) {
    message += `\n*Top Actions:*\n`;
    topActions.forEach((action, i) => {
      const energy = action.energy === 'high' ? '🔥' : action.energy === 'low' ? '💤' : '⚡';
      message += `${i + 1}. ${energy} ${action.title}\n`;
    });
  }

  return { success: true, message };
}

/**
 * List next actions
 * /next or /actions
 */
async function listActions(limit = 5) {
  const data = await apiCall(`/actions?status=next&limit=${limit}`);

  if (data.error) return data;

  let message = `⚡ *Next Actions*\n\n`;

  if (data.actions.length === 0) {
    message += `No next actions. Add some with /add`;
  } else {
    data.actions.forEach((action, i) => {
      const energy = action.energy === 'high' ? '🔥' : action.energy === 'low' ? '💤' : '⚡';
      message += `${i + 1}. [${action.id}] ${energy} ${action.title}\n`;
    });
    message += `\n_Use /done {id} to complete_`;
  }

  return { success: true, message, actions: data.actions };
}

/**
 * Complete an action
 * /done 5
 */
async function completeAction(id) {
  return apiCall(`/actions/${id}/complete`, 'POST');
}

/**
 * List projects
 * /projects
 */
async function listProjects() {
  const data = await apiCall('/projects?limit=10');

  if (data.error) return data;

  let message = `📁 *Active Projects*\n\n`;

  if (data.projects.length === 0) {
    message += `No active projects.`;
  } else {
    data.projects.forEach((project, i) => {
      const progress = project.nextActions > 0 ? `(${project.nextActions} actions)` : '(no actions)';
      message += `${i + 1}. ${project.name} ${progress}\n`;
    });
  }

  return { success: true, message, projects: data.projects };
}

/**
 * Get inbox items
 * /inbox
 */
async function getInbox() {
  const data = await apiCall('/inbox?limit=10');

  if (data.error) return data;

  let message = `📥 *Inbox*\n\n`;

  if (data.items.length === 0) {
    message += `Inbox is empty! 🎉`;
  } else {
    data.items.forEach((item, i) => {
      message += `${i + 1}. [${item.id}] ${item.text}\n`;
    });
    message += `\n_Use /process {id} to process_`;
  }

  return { success: true, message, items: data.items };
}

/**
 * Health check
 * /ping
 */
async function health() {
  const data = await apiCall('/health');
  return data.status === 'ok'
    ? { success: true, message: '🟢 GENESIS is online!' }
    : { success: false, message: '🔴 GENESIS is offline' };
}

// =====================================================
// TELEGRAM BOT HANDLER EXAMPLE
// =====================================================

/**
 * Example handler for Telegram bot
 * Add this to your existing Clawdbot message handler
 */
async function handleGenesisCommand(text, sendMessage) {
  try {
    // /add <text> - Quick capture
    if (text.startsWith('/add ')) {
      const result = await capture(text.replace('/add ', ''));
      return sendMessage(result.message);
    }

    // /status or /dashboard - Show dashboard
    if (text === '/status' || text === '/dashboard' || text === '/g') {
      const result = await dashboard();
      return sendMessage(result.message, { parse_mode: 'Markdown' });
    }

    // /next or /actions - List next actions
    if (text === '/next' || text === '/actions') {
      const result = await listActions();
      return sendMessage(result.message, { parse_mode: 'Markdown' });
    }

    // /done <id> - Complete action
    if (text.startsWith('/done ')) {
      const id = text.replace('/done ', '').trim();
      const result = await completeAction(id);
      return sendMessage(result.message);
    }

    // /projects - List projects
    if (text === '/projects') {
      const result = await listProjects();
      return sendMessage(result.message, { parse_mode: 'Markdown' });
    }

    // /inbox - Show inbox
    if (text === '/inbox') {
      const result = await getInbox();
      return sendMessage(result.message, { parse_mode: 'Markdown' });
    }

    // /ping - Health check
    if (text === '/ping') {
      const result = await health();
      return sendMessage(result.message);
    }

    return false; // Not a GENESIS command
  } catch (error) {
    console.error('GENESIS error:', error);
    return sendMessage(`❌ GENESIS error: ${error.message}`);
  }
}

module.exports = {
  capture,
  dashboard,
  listActions,
  completeAction,
  listProjects,
  getInbox,
  health,
  handleGenesisCommand,
  // Direct API access
  apiCall
};
