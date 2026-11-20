/**
 * Dhakkan's Tours & Travels — 100% Free GitHub-Backed Data & Synchronization Config
 * Owned & Managed on GitHub: https://github.com/DhakkansGroup
 * 
 * 100% Free Forever · Zero Paid Services · Zero Quota Limits
 * 
 * Synchronizes all admin updates across Incognito tabs, mobile browsers,
 * and global visitors directly via your GitHub repository.
 */

window.DHAKKANS_GITHUB_CONFIG = {
  // Your GitHub Organization / Username:
  owner: "DhakkansGroup",
  
  // Your GitHub Repository Name:
  repo: "dhakkans-website",
  
  // Branch (typically 'main' or 'master'):
  branch: "main",
  
  // Path to the database file in your repository:
  path: "data/db.json",
  
  // Optional GitHub Personal Access Token (for 1-click direct commits from Admin Panel)
  // Can also be entered securely in Admin Panel -> "GitHub Cloud Sync" tab:
  token: ""
};

// Google Drive Cloud Uploader Webhook (dhakkanstreksandtours@gmail.com)
// Entered per session in Admin Desk -> "Image Uploader & CDN" tab:
window.DHAKKANS_GDRIVE_WEBHOOK = "";
