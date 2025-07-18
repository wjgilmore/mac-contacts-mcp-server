# Contacts MCP Server Tests

This directory contains automated tests for the Contacts MCP Server.

## Running Tests

### Full Test Suite
```bash
npm test
```

### Quick Run (in project root)
```bash
node test/test-contacts-server.js
```

### Direct Execution
```bash
cd test
node test-contacts-server.js
```

## What Gets Tested

The test suite validates:

1. **Basic AppleScript Execution** - Ensures AppleScript can run
2. **Permission Checking** - Verifies Contacts app access
3. **Contact Count** - Tests basic contact enumeration
4. **Data Format** - Validates the new tab-delimited format
5. **Data Parsing** - Tests JavaScript parsing with mock data
6. **Full Data Flow** - End-to-end contact retrieval
7. **MCP Tools** - Tests actual MCP tool responses
8. **Error Handling** - Validates proper error management

## Prerequisites

Before running tests, ensure:
- You have granted Contacts permission to Terminal/your shell
- The Contacts app is accessible
- You have some contacts in your Contacts app (for full testing)

## Test Output

The test suite provides detailed output including:
- Individual test status (✅ pass / ❌ fail)
- Contact counts and sample data
- Permission status
- Detailed error messages for debugging

## Permission Issues

If permission tests fail:
1. Open System Preferences → Security & Privacy → Privacy
2. Add Terminal to "Contacts" permissions
3. May also need "Automation" permissions
4. Restart Terminal and rerun tests

## Mock Data Testing

Some tests use mock contact data to validate parsing logic without requiring real contacts. This ensures the parsing logic works correctly even on systems with no contacts.
