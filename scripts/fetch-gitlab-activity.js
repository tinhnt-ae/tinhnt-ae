#!/usr/bin/env node
/**
 * Fetch GitLab activity from multiple instances and update README.md
 * Supports gitlab.com + self-hosted GitLab
 * Requires Node.js 18+ (uses built-in fetch)
 */

const fs = require('fs');
const path = require('path');

// Configuration for GitLab.com
const GITLAB1 = {
  apiUrl: 'https://gitlab.com/api/v4',
  username: process.env.GITLAB_USERNAME,
  token: process.env.GITLAB_TOKEN,
  label: '🦊 GitLab.com'
};

// Configuration for self-hosted GitLab
const GITLAB2 = {
  apiUrl: process.env.GITLAB2_URL ? `${process.env.GITLAB2_URL}/api/v4` : null,
  username: process.env.GITLAB2_USERNAME,
  token: process.env.GITLAB2_TOKEN,
  label: '🏢 Self-hosted'
};

const MAX_EVENTS = parseInt(process.env.MAX_EVENTS || '15', 10);
const README_PATH = path.join(__dirname, '..', 'README.md');

const START_MARKER = '<!-- START_GITLAB_ACTIVITY -->';
const END_MARKER = '<!-- END_GITLAB_ACTIVITY -->';

/**
 * Fetch JSON from URL
 */
async function fetchJson(url, token) {
  const headers = {
    'User-Agent': 'GitLab-Activity-Fetcher',
    'Accept': 'application/json'
  };
  if (token) {
    headers['PRIVATE-TOKEN'] = token;
  }

  console.log(`📡 Fetching: ${url}`);
  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  return response.json();
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(isoString) {
  return isoString.split('T')[0];
}

/**
 * Get event emoji based on action
 */
function getEventEmoji(actionName) {
  const action = actionName.toLowerCase();
  if (action.includes('push')) return '🚀';
  if (action.includes('opened') || action.includes('created')) return '✨';
  if (action.includes('merged')) return '🎉';
  if (action.includes('comment')) return '💬';
  if (action.includes('closed')) return '✅';
  if (action.includes('approved')) return '👍';
  if (action.includes('joined')) return '🤝';
  return '📌';
}

/**
 * Format single event to markdown
 */
function formatEvent(event, projectName, projectUrl, instanceLabel) {
  const date = formatDate(event.created_at);
  const emoji = getEventEmoji(event.action_name);
  const action = event.action_name;
  
  let title = event.target_title || '';
  
  // Special handling for push events
  if (action.toLowerCase().includes('pushed')) {
    const pushData = event.push_data || {};
    const commitCount = pushData.commit_count || 1;
    const branchName = pushData.ref || 'branch';
    title = `${commitCount} commit(s) to ${branchName}`;
  }
  
  // Build markdown line with instance label
  if (projectUrl && projectName) {
    if (title) {
      return `- ${emoji} **${action}** "${title}" in [${projectName}](${projectUrl}) ${instanceLabel} • \`${date}\``;
    } else {
      return `- ${emoji} **${action}** in [${projectName}](${projectUrl}) ${instanceLabel} • \`${date}\``;
    }
  } else {
    if (title) {
      return `- ${emoji} **${action}** "${title}" ${instanceLabel} • \`${date}\``;
    } else {
      return `- ${emoji} **${action}** ${instanceLabel} • \`${date}\``;
    }
  }
}

/**
 * Fetch events from a GitLab instance
 */
async function fetchFromInstance(config) {
  if (!config.apiUrl || !config.username) {
    console.log(`⏭️  Bỏ qua ${config.label} (không có config)`);
    return [];
  }

  console.log(`\n${config.label}`);
  console.log(`👤 Username: ${config.username}`);
  console.log(`🔑 Token: ${config.token ? 'Có ✅' : 'Không (public API)'}`);

  try {
    // Get user ID
    console.log('🔍 Tìm user ID...');
    const users = await fetchJson(
      `${config.apiUrl}/users?username=${encodeURIComponent(config.username)}`,
      config.token
    );
    
    if (!users || users.length === 0) {
      throw new Error(`Không tìm thấy user: ${config.username}`);
    }
    
    const user = users[0];
    const userId = user.id;
    console.log(`✅ Tìm thấy user: ${user.name} (ID: ${userId})`);
    
    // Fetch events
    console.log('📥 Lấy events...');
    const events = await fetchJson(
      `${config.apiUrl}/users/${userId}/events?per_page=${MAX_EVENTS}&sort=desc`,
      config.token
    );
    
    console.log(`✅ Lấy được ${events.length} events`);
    
    // Attach metadata to events
    return events.map(event => ({
      ...event,
      _instance: config.label,
      _apiUrl: config.apiUrl,
      _token: config.token
    }));
    
  } catch (error) {
    console.error(`❌ Lỗi khi fetch từ ${config.label}: ${error.message}`);
    return [];
  }
}

/**
 * Get project info for an event
 */
async function getProjectInfo(event) {
  if (!event.project_id) {
    return { name: '', url: '' };
  }

  try {
    const project = await fetchJson(
      `${event._apiUrl}/projects/${event.project_id}`,
      event._token
    );
    return {
      name: project.name,
      url: project.web_url
    };
  } catch (err) {
    console.log(`⚠️  Không lấy được thông tin project ${event.project_id}`);
    return { name: '', url: '' };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🦊 GitLab Activity Fetcher (Multi-Instance)\n');
  console.log(`📊 Max events: ${MAX_EVENTS}\n`);
  
  // Fetch from both instances
  const [events1, events2] = await Promise.all([
    fetchFromInstance(GITLAB1),
    fetchFromInstance(GITLAB2)
  ]);
  
  // Merge and sort by date (newest first)
  const allEvents = [...events1, ...events2].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  
  // Count active instances
  const activeInstances = [events1, events2].filter(events => events.length > 0).length;
  console.log(`\n📊 Tổng cộng: ${allEvents.length} events từ ${activeInstances} instance(s)\n`);
  
  if (allEvents.length === 0) {
    console.log('⚠️  Không có activity nào');
  }
  
  // Format events
  console.log('📝 Format activity...');
  const lines = [];
  
  for (const event of allEvents.slice(0, MAX_EVENTS)) {
    const projectInfo = await getProjectInfo(event);
    const line = formatEvent(event, projectInfo.name, projectInfo.url, event._instance);
    lines.push(line);
  }
  
  // Build new content
  const activityContent = lines.length > 0
    ? lines.join('\n')
    : '_Không có activity công khai gần đây trên GitLab._';
  
  const newBlock = [
    START_MARKER,
    activityContent,
    END_MARKER
  ].join('\n');
  
  // Update README
  console.log('\n📄 Cập nhật README.md...');
  
  if (!fs.existsSync(README_PATH)) {
    console.error(`❌ Không tìm thấy README.md tại: ${README_PATH}`);
    process.exit(1);
  }
  
  let readme = fs.readFileSync(README_PATH, 'utf8');
  
  if (!readme.includes(START_MARKER) || !readme.includes(END_MARKER)) {
    console.error('❌ Không tìm thấy markers trong README.md');
    console.error(`   Cần có: ${START_MARKER} và ${END_MARKER}`);
    process.exit(1);
  }
  
  const regex = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`, 'm');
  const newReadme = readme.replace(regex, newBlock);
  
  fs.writeFileSync(README_PATH, newReadme, 'utf8');
  
  console.log('✅ README.md đã được cập nhật!');
  console.log('\n🎉 Hoàn thành!\n');
}

// Run
main().catch(err => {
  console.error('\n❌ Lỗi:', err.message);
  process.exit(1);
});
