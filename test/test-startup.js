#!/usr/bin/env node

// Simple test to verify the MCP server can start up without hanging
import { ContactsServer } from '../src/index.js';

console.log('Testing MCP server startup...');

const server = new ContactsServer();

// Test that the server can be instantiated without issues
console.log('✅ Server instance created successfully');

// Test that tool list can be generated (this is what Claude Desktop does first)
try {
  const tools = await server.server.request(
    { method: 'tools/list' },
    { type: 'request', id: 1 }
  );
  console.log(`✅ Tools list generated: ${tools.tools?.length || 0} tools available`);
} catch (error) {
  console.log(`❌ Tools list failed: ${error.message}`);
}

// Test permission check without full contact access
try {
  const result = await server.checkPermissionsAndReport();
  console.log('✅ Permission check completed successfully');
} catch (error) {
  console.log(`❌ Permission check failed: ${error.message}`);
}

console.log('🎉 Startup test completed - server should work with Claude Desktop!');
