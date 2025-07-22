# Apple Contacts MCP Server

ACMS (Apple Contacts MCP Server) is a Model Context Protocol (MCP) server that provides read-only access to your macOS Contacts using AppleScript. This server allows Claude Desktop to search and retrieve contact information. At present it is read-only.

## Features

- **Read-only access** to macOS contacts database via AppleScript
- **No native dependencies** - uses AppleScript through osascript command
- **Multiple search methods**: by name or general query
- **Flexible matching**: both exact and partial matching options

## Installing ACMS on Claude Desktop

To install ACMS on Claude Desktop, download the latest release from the GitHub project page, double-click the downloaded file, and follow the prompts inside Claude Desktop.

## Available Tools

### 1. `search_contacts`
General-purpose search that searches contact names:
- `query`: Search across contact names
- `limit`: Maximum results to return (default: 50)

### 2. `get_contact_by_name`
Search contacts by name with exact or partial matching.

### 3. `get_all_contacts`
Retrieve all contacts (use with caution for large contact lists).

### 4. `get_contact_count`
Simple diagnostic tool that returns the total number of contacts in your address book.

### 5. `get_contact_names`
Diagnostic tool that returns the names of the first few contacts (useful for testing).

### 6. `check_permissions`
Diagnostic tool to check if the required permissions are granted to access Contacts.

### 7. `test_contact_processing`
Advanced diagnostic tool to test contact processing and identify performance issues.

## Building From Source

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Make the script executable**:
   ```bash
   chmod +x src/index.js
   ```
4. **Run the tests** (optional but fun):
   ```
   npm run test
   ```
5. Package the DXT
   ```
   npx @anthropic-ai/dxt pack
   ```

Then double-click the `mac-contacts-mcp-server.dxt` file to add it to Claude Desktop.

## Permissions

The first time you run this server, macOS will request permission to access your contacts through AppleScript. You must grant this permission for the server to function. The server uses AppleScript to communicate with the Contacts app, ensuring read-only access to your contact data.

## Usage Examples

Once configured in Claude Desktop, you can use natural language to interact with your contacts:

- "Search for John Smith"
- "Find contacts with the name Mike"
- "Show me the first few contacts"
- "How many contacts do I have?"

## Requirements

- **macOS**: This server only works on macOS due to AppleScript dependency
- **Node.js**: Version 14 or higher (no native compilation required)
- **Permissions**: Contacts access permission when prompted by macOS

## Security

- This server provides **read-only** access to your contacts via AppleScript
- No contact data is stored or transmitted outside of Claude Desktop
- Uses standard macOS AppleScript security model
- Error messages are user-friendly and don't expose system details

## Troubleshooting

### "Error accessing contacts" message
- Ensure you've granted contacts permission when prompted by macOS
- Check that the Contacts app is accessible (try opening it manually)
- Verify AppleScript permissions in System Preferences > Security & Privacy > Privacy > Automation
- Make sure Node.js has permission to execute osascript commands

### Server not appearing in Claude Desktop
- Check the configuration file path and syntax
- Ensure the server file path is correct and the file is executable
- Restart Claude Desktop after configuration changes

### No contacts returned
- Verify your contacts database has data (check the Contacts app)
- Try using different search terms or the `get_all_contacts` tool with a limit

## Caveats

* "But Apple will eventually build one macOS MCP server to rule them all." I know that but don't care. I'm a nerd and like building stuff.
* "But Anthropic will see all of my contacts." Then don't install it.

## Development

To run the server directly for testing:
```bash
npm start
```

The server uses stdio transport and will log initialization messages to stderr.
