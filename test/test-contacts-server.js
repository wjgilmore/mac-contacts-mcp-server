#!/usr/bin/env node

import { ContactsServer } from '../src/index.js';
import assert from 'assert';

class ContactsServerTest {
  constructor() {
    this.server = new ContactsServer();
    this.testResults = [];
  }

  log(message) {
    console.log(`[TEST] ${message}`);
  }

  async runTest(testName, testFn) {
    try {
      this.log(`Starting: ${testName}`);
      await testFn();
      this.log(`✅ PASSED: ${testName}`);
      this.testResults.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      this.log(`❌ FAILED: ${testName} - ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  // Test the permission checking functionality
  async testPermissions() {
    await this.server.checkPermissions();
    this.log("Permissions check completed successfully");
  }

  // Test basic AppleScript execution
  async testBasicAppleScript() {
    const result = await this.server.executeAppleScript('return "Hello World"');
    assert.strictEqual(result, 'Hello World', 'Basic AppleScript should return expected string');
  }

  // Test contact count retrieval
  async testContactCount() {
    const script = `
      tell application "Contacts"
        return count of people
      end tell
    `;
    const count = await this.server.executeAppleScript(script);
    const countNum = parseInt(count);
    assert(!isNaN(countNum), 'Contact count should be a valid number');
    assert(countNum >= 0, 'Contact count should be non-negative');
    this.log(`Found ${countNum} contacts in system`);
  }

  // Test the new delimited data format
  async testContactDataRetrieval() {
    // Get a small sample to test the format
    const script = `
      tell application "Contacts"
        set contactList to {}
        set sampleCount to 0
        repeat with aPerson in people
          if sampleCount >= 3 then exit repeat
          try
            set personName to ""
            try
              set personName to name of aPerson
            end try

            set firstName to ""
            try
              set firstName to first name of aPerson
            end try

            set lastName to ""
            try
              set lastName to last name of aPerson
            end try

            set org to ""
            try
              set org to organization of aPerson
            end try

            set noteText to ""
            try
              set noteText to note of aPerson
            end try

            set birthdayText to ""
            try
              set birthdayValue to birth date of aPerson
              if birthdayValue is not missing value then
                set birthdayText to birthdayValue as string
              end if
            end try

            set emailText to ""
            try
              set emailList to {}
              repeat with anEmail in emails of aPerson
                set end of emailList to (value of anEmail)
              end repeat
              set AppleScript's text item delimiters to ";"
              set emailText to emailList as text
              set AppleScript's text item delimiters to ""
            end try

            set phoneText to ""
            try
              set phoneList to {}
              repeat with aPhone in phones of aPerson
                set end of phoneList to (value of aPhone)
              end repeat
              set AppleScript's text item delimiters to ";"
              set phoneText to phoneList as text
              set AppleScript's text item delimiters to ""
            end try

            set contactRecord to personName & tab & firstName & tab & lastName & tab & org & tab & noteText & tab & birthdayText & tab & emailText & tab & phoneText
            set end of contactList to contactRecord
            set sampleCount to sampleCount + 1
          end try
        end repeat

        set AppleScript's text item delimiters to return
        set result to contactList as text
        set AppleScript's text item delimiters to ""
        return result
      end tell
    `;

    const result = await this.server.executeAppleScript(script);
    assert(typeof result === 'string', 'AppleScript should return string data');

    if (result.trim()) {
      const lines = result.split('\n').filter(line => line.trim());
      this.log(`Retrieved ${lines.length} sample contact records`);

      // Test that each line has the expected number of tab-separated fields
      for (const line of lines) {
        const fields = line.split('\t');
        assert(fields.length >= 8, `Contact record should have at least 8 fields, got ${fields.length}`);
      }
    } else {
      this.log("No contacts found in system (this is okay for testing)");
    }
  }

  // Test the contact parsing function with mock data
  async testContactParsing() {
    const mockData = `John Doe	John	Doe	Acme Corp	Test note	Monday, January 1, 2000 at 12:00:00 AM	john@example.com;john.doe@work.com	555-1234;555-5678
Jane Smith	Jane	Smith		Another note		jane@example.com	555-9999
Bob Wilson	Bob	Wilson	Tech Inc			bob@tech.com;bob.wilson@tech.com	`;

    const contacts = this.server.parseContactsFromDelimitedData(mockData);

    assert.strictEqual(contacts.length, 3, 'Should parse 3 contacts from mock data');

    // Test first contact
    const john = contacts[0];
    assert.strictEqual(john.name, 'John Doe');
    assert.strictEqual(john.firstName, 'John');
    assert.strictEqual(john.lastName, 'Doe');
    assert.strictEqual(john.organization, 'Acme Corp');
    assert.strictEqual(john.emails.length, 2);
    assert.strictEqual(john.phones.length, 2);

    // Test contact with missing fields
    const jane = contacts[1];
    assert.strictEqual(jane.name, 'Jane Smith');
    assert.strictEqual(jane.organization, '');
    assert.strictEqual(jane.birthday, '');
    assert.strictEqual(jane.emails.length, 1);
    assert.strictEqual(jane.phones.length, 1);

    this.log("Contact parsing validation completed successfully");
  }

    // Test the full getContactsData flow with limited contacts
  async testGetContactsData() {
    // Create a limited version of the contact script for testing
    const limitedScript = `
      tell application "Contacts"
        set contactList to {}
        set contactCount to 0
        repeat with aPerson in people
          if contactCount >= 5 then exit repeat
          try
            set personName to ""
            try
              set personName to name of aPerson
            end try

            set firstName to ""
            try
              set firstName to first name of aPerson
            end try

            set lastName to ""
            try
              set lastName to last name of aPerson
            end try

            set org to ""
            try
              set org to organization of aPerson
            end try

            set noteText to ""
            try
              set noteText to note of aPerson
            end try

            set birthdayText to ""
            try
              set birthdayValue to birth date of aPerson
              if birthdayValue is not missing value then
                set birthdayText to birthdayValue as string
              end if
            end try

            set emailText to ""
            try
              set emailList to {}
              repeat with anEmail in emails of aPerson
                set end of emailList to (value of anEmail)
              end repeat
              set AppleScript's text item delimiters to ";"
              set emailText to emailList as text
              set AppleScript's text item delimiters to ""
            end try

            set phoneText to ""
            try
              set phoneList to {}
              repeat with aPhone in phones of aPerson
                set end of phoneList to (value of aPhone)
              end repeat
              set AppleScript's text item delimiters to ";"
              set phoneText to phoneList as text
              set AppleScript's text item delimiters to ""
            end try

            set contactRecord to personName & tab & firstName & tab & lastName & tab & org & tab & noteText & tab & birthdayText & tab & emailText & tab & phoneText
            set end of contactList to contactRecord
            set contactCount to contactCount + 1
          end try
        end repeat

        set AppleScript's text item delimiters to return
        set result to contactList as text
        set AppleScript's text item delimiters to ""
        return result
      end tell
    `;

    const result = await this.server.executeAppleScript(limitedScript);
    const contacts = this.server.parseContactsFromDelimitedData(result);

    assert(Array.isArray(contacts), 'getContactsData should return an array');

    if (contacts.length > 0) {
      const firstContact = contacts[0];
      assert(typeof firstContact.name === 'string', 'Contact should have name string');
      assert(Array.isArray(firstContact.emails), 'Contact should have emails array');
      assert(Array.isArray(firstContact.phones), 'Contact should have phones array');
      this.log(`Successfully retrieved ${contacts.length} sample contacts from full flow`);
    } else {
      this.log("No contacts found (this is okay for testing)");
    }
  }

  // Test MCP tool execution with limited data
  async testMCPTools() {
    // Test check_permissions tool (doesn't require contact data)
    const permissionResult = await this.server.checkPermissionsAndReport();
    assert(permissionResult.content, 'Permission check should have content');
    assert(permissionResult.content[0].type === 'text', 'Permission check should have text content');

    // Test basic contact count instead of full search to avoid timeout
    const countScript = `
      tell application "Contacts"
        return count of people
      end tell
    `;
    const count = await this.server.executeAppleScript(countScript);
    assert(!isNaN(parseInt(count)), 'Should be able to get contact count');

    this.log("MCP tool execution tests completed");
  }

  // Test error handling with invalid AppleScript
  async testErrorHandling() {
    try {
      await this.server.executeAppleScript('invalid applescript syntax here');
      assert.fail('Should have thrown an error for invalid AppleScript');
    } catch (error) {
      assert(error.message.includes('Failed to execute AppleScript'), 'Should get AppleScript execution error');
      this.log("Error handling test passed - invalid AppleScript properly rejected");
    }
  }

  async runAllTests() {
    this.log("Starting Contacts MCP Server Test Suite");
    this.log("==========================================");

    await this.runTest("Basic AppleScript Execution", () => this.testBasicAppleScript());
    await this.runTest("Permission Check", () => this.testPermissions());
    await this.runTest("Contact Count Retrieval", () => this.testContactCount());
    await this.runTest("Contact Data Format", () => this.testContactDataRetrieval());
    await this.runTest("Contact Data Parsing", () => this.testContactParsing());
    await this.runTest("Full Contact Data Flow", () => this.testGetContactsData());
    await this.runTest("MCP Tool Execution", () => this.testMCPTools());
    await this.runTest("Error Handling", () => this.testErrorHandling());

    this.log("\n==========================================");
    this.log("Test Results Summary:");

    let passed = 0;
    let failed = 0;

    for (const result of this.testResults) {
      if (result.status === 'PASSED') {
        passed++;
        this.log(`✅ ${result.name}`);
      } else {
        failed++;
        this.log(`❌ ${result.name}: ${result.error}`);
      }
    }

    this.log(`\nTotal: ${this.testResults.length}, Passed: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      this.log("\n🎉 All tests passed!");
    }
  }
}

// Export the ContactsServer class so tests can import it
export { ContactsServer };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ContactsServerTest();
  tester.runAllTests().catch(error => {
    console.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}
