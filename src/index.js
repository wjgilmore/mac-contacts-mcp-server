#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';

class ContactsServer {
  constructor() {
    this.permissionsChecked = false;
    this.server = new Server(
      {
        name: 'contacts-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_contacts',
            description: 'Search contacts with various filters including name, email, organization, phone, and notes',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'General search query that will be matched against name, email, organization, and notes'
                },
                name: {
                  type: 'string',
                  description: 'Filter by name (partial match, case insensitive)'
                },
                email: {
                  type: 'string',
                  description: 'Filter by email address (partial match, case insensitive)'
                },
                organization: {
                  type: 'string',
                  description: 'Filter by organization/company (partial match, case insensitive)'
                },
                phone: {
                  type: 'string',
                  description: 'Filter by phone number (partial match)'
                },
                has_birthday: {
                  type: 'boolean',
                  description: 'Filter contacts that have birthday information'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 50)',
                  default: 50
                }
              },
              additionalProperties: false
            }
          },
          {
            name: 'get_contact_by_name',
            description: 'Get contacts by exact or partial name match',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name to search for (partial match supported)'
                },
                exact_match: {
                  type: 'boolean',
                  description: 'Whether to require exact name match (default: false)',
                  default: false
                }
              },
              required: ['name'],
              additionalProperties: false
            }
          },

          {
            name: 'get_all_contacts',
            description: 'Get all contacts (limited to 200 by default for performance)',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of contacts to return (default: 100)',
                  default: 100
                },
                unlimited: {
                  type: 'boolean',
                  description: 'Set to true to bypass the 200 contact limit (may be slow for large lists)',
                  default: false
                }
              },
              additionalProperties: false
            }
          },
          {
            name: 'check_permissions',
            description: 'Check if the required permissions are granted to access Contacts and provide troubleshooting information',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          },
          {
            name: 'test_contact_processing',
            description: 'Test contact processing with a small sample to diagnose performance issues',
            inputSchema: {
              type: 'object',
              properties: {
                sample_size: {
                  type: 'number',
                  description: 'Number of contacts to test (default: 5)',
                  default: 5
                }
              },
              additionalProperties: false
            }
          },
          {
            name: 'get_contact_count',
            description: 'Simple test: just return the total number of contacts in the address book',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false
            }
          },
          {
            name: 'get_contact_names',
            description: 'Simple test: get just the names of the first few contacts (no emails/phones)',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of contact names to return (default: 5)',
                  default: 5,
                  minimum: 1,
                  maximum: 20
                }
              },
              additionalProperties: false
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'search_contacts':
            return await this.searchContacts(request.params.arguments);
          case 'get_contact_by_name':
            return await this.getContactByName(request.params.arguments);
          case 'get_all_contacts':
            return await this.getAllContacts(request.params.arguments);
          case 'check_permissions':
            return await this.checkPermissionsAndReport(request.params.arguments);
          case 'test_contact_processing':
            return await this.testContactProcessing(request.params.arguments);
          case 'get_contact_count':
            return await this.getContactCount(request.params.arguments);
          case 'get_contact_names':
            return await this.getContactNames(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error accessing contacts: ${error.message}\n\n💡 Try using the 'check_permissions' tool first to diagnose permission issues. You may need to grant Contacts and Automation permissions to Claude Desktop or Terminal in System Preferences.`
            }
          ]
        };
      }
    });
  }

  async executeAppleScript(script) {
    try {
      // Use longer timeout for large contact lists
      const timeout = script.includes('repeat with aPerson in people') ? 120000 : 30000;
      const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>/dev/null`, {
        encoding: 'utf8',
        timeout: timeout
      });
      return result.trim();
    } catch (error) {
      // Log detailed error information to stderr for debugging
      const errorDetails = error.stdout || error.stderr || error.message;
      console.error(`AppleScript execution failed (exit code: ${error.status}): ${errorDetails}`);
      console.error(`Script was: ${script.substring(0, 200)}...`);

      // Throw a user-friendly error for the response
      throw new Error(`Failed to execute AppleScript (exit code: ${error.status})`);
    }
  }

    async checkPermissions() {
    const testScript = `
      tell application "System Events"
        return "System Events accessible"
      end tell
    `;

    try {
      await this.executeAppleScript(testScript);
    } catch (error) {
      console.error(`System Events permission check failed: ${error.message}`);
      throw new Error(`System Events not accessible`);
    }

    const contactsTestScript = `
      tell application "Contacts"
        return "Contacts accessible"
      end tell
    `;

    try {
      await this.executeAppleScript(contactsTestScript);
    } catch (error) {
      console.error(`Contacts permission check failed: ${error.message}`);
      throw new Error(`Contacts app not accessible - permission not granted`);
    }
  }

  async checkPermissionsAndReport() {
    try {
      await this.checkPermissions();

      // If we get here, basic permissions are working. Let's try a simple contact count.
      const countScript = `
        tell application "Contacts"
          return count of people
        end tell
      `;

      const count = await this.executeAppleScript(countScript);

      return {
        content: [
          {
            type: 'text',
            text: `✅ Permissions check passed!\n\nSystem Events: Accessible\nContacts app: Accessible\nContact count: ${count}\n\nThe MCP server should be able to access your contacts. If you're still experiencing issues, try restarting the Claude Desktop app.`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Permissions check failed: ${error.message}\n\n🔧 Troubleshooting steps:\n\n1. Open System Preferences/Settings → Security & Privacy → Privacy\n2. Look for "Contacts" in the left sidebar\n3. Make sure the Terminal app (or Claude Desktop) is listed and checked\n4. If not listed, try running the MCP server from Terminal first to trigger the permission prompt\n5. You may also need to grant "Automation" permissions\n6. Restart Claude Desktop after granting permissions\n\nNote: On newer macOS versions, you might need to grant permissions to both the Terminal app and Claude Desktop separately.`
          }
        ]
      };
        }
  }

  async getContactCount(args) {
    // Simplest possible test - just count contacts
    console.error(`Getting contact count...`);

    const countScript = `
      tell application "Contacts"
        return count of people
      end tell
    `;

    try {
      const result = await this.executeAppleScript(countScript);
      const count = parseInt(result.trim());

      console.error(`Contact count retrieved: ${count}`);

      return {
        content: [
          {
            type: 'text',
            text: `📊 Total contacts in address book: ${count}\n\nThis confirms basic Contacts app connectivity is working.`
          }
        ]
      };
    } catch (error) {
      console.error(`Contact count failed: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get contact count: ${error.message}\n\nThis suggests a fundamental issue with Contacts app access.`
          }
        ]
      };
    }
  }

  async getContactNames(args) {
    // Simple test - get just names of first few contacts
    const limit = args.limit || 5;
    console.error(`Getting names of first ${limit} contacts...`);

                    const namesScript = `
      tell application "Contacts"
        return (name of person 1) & return & (name of person 2) & return & (name of person 3)
      end tell
    `;

            try {
      const result = await this.executeAppleScript(namesScript);
      const names = result.split(/[\r\n]+/).filter(name => name.trim());

      console.error(`Retrieved ${names.length} contact names`);

      const namesList = names.map((name, index) => `${index + 1}. ${name}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📝 First ${names.length} contact names:\n\n${namesList}\n\nThis tests basic contact field access without complex data extraction.`
          }
        ]
      };
    } catch (error) {
      console.error(`Get contact names failed: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get contact names: ${error.message}\n\nThis suggests issues with accessing contact fields.`
          }
        ]
      };
    }
  }

  async testContactProcessing(args) {
    await this.checkPermissions();
    const sampleSize = args.sample_size || 5;

    console.error(`Testing contact processing with ${sampleSize} contacts...`);

    const testScript = `
      tell application "Contacts"
        set testResults to {}
        set processedCount to 0
        set maxSample to ${sampleSize}

        repeat with aPerson in people
          if processedCount >= maxSample then exit repeat

          try
            set startTime to current date

            -- Test basic field access
            set personName to ""
            try
              set personName to name of aPerson
            end try

            -- Test email access (often problematic)
            set emailCount to 0
            try
              set emailCount to count of emails of aPerson
            end try

            -- Test phone access
            set phoneCount to 0
            try
              set phoneCount to count of phones of aPerson
            end try

            -- Test organization access
            set orgName to ""
            try
              set orgName to organization of aPerson
            end try

            set endTime to current date
            set processingTime to endTime - startTime

            set testResult to "Contact " & (processedCount + 1) & ": " & personName & " (emails:" & emailCount & ", phones:" & phoneCount & ", time:" & processingTime & "s)"
            set end of testResults to testResult
            set processedCount to processedCount + 1

          on error errMsg
            set errorResult to "Contact " & (processedCount + 1) & ": ERROR - " & errMsg
            set end of testResults to errorResult
            set processedCount to processedCount + 1
          end try
        end repeat

        set AppleScript's text item delimiters to return
        set result to testResults as text
        set AppleScript's text item delimiters to ""
        return result
      end tell
    `;

    try {
      const result = await this.executeAppleScript(testScript);

      return {
        content: [
          {
            type: 'text',
            text: `Contact Processing Test Results:\n\n${result}\n\nThis helps identify if specific contacts are causing performance issues.`
          }
        ]
      };
    } catch (error) {
      console.error(`Contact processing test failed: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: `Contact processing test failed: ${error.message}\n\nThis suggests there may be fundamental AppleScript execution issues in the Claude Desktop environment.`
          }
        ]
      };
    }
  }

  async getContactsData() {
    // Only do permission check on first access to avoid delays
    if (!this.permissionsChecked) {
      try {
        await this.checkPermissions();
        this.permissionsChecked = true;
        console.error(`Initial permissions check passed`);
      } catch (error) {
        console.error(`Permission check failed: ${error.message}`);
        throw error;
      }
    }

    // Much simpler AppleScript that returns delimited data instead of JSON
    const script = `
      tell application "Contacts"
        set contactList to {}
        set contactCount to 0
        set maxContacts to 50
        repeat with aPerson in people
          if contactCount >= maxContacts then exit repeat
          try
            -- Get basic info with safe defaults
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

            -- Get emails (concatenated with semicolons)
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

            -- Get phones (concatenated with semicolons)
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

            -- Create tab-delimited record
            set contactRecord to personName & tab & firstName & tab & lastName & tab & org & tab & noteText & tab & birthdayText & tab & emailText & tab & phoneText
            set end of contactList to contactRecord
            set contactCount to contactCount + 1
          end try
        end repeat

        -- Return newline-delimited list
        set AppleScript's text item delimiters to return
        set result to contactList as text
        set AppleScript's text item delimiters to ""
        return result
      end tell
    `;

    const result = await this.executeAppleScript(script);
    if (!result) {
      console.error(`No result returned from AppleScript`);
      return [];
    }

    // Parse the tab-delimited data in JavaScript
    try {
      const contacts = this.parseContactsFromDelimitedData(result);
      console.error(`Successfully parsed ${contacts.length} contacts from AppleScript`);
      return contacts;
    } catch (e) {
      console.error(`Contact parsing failed: ${e.message}`);
      console.error(`Result was: ${result.substring(0, 500)}...`);
      return [];
    }
  }

  parseContactsFromDelimitedData(data) {
    const contacts = [];
    const lines = data.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const fields = line.split('\t');
        if (fields.length >= 8) {
          const contact = {
            name: fields[0] || '',
            firstName: fields[1] || '',
            lastName: fields[2] || '',
            organization: fields[3] || '',
            note: fields[4] || '',
            birthday: fields[5] || '',
            emails: fields[6] ? fields[6].split(';').filter(email => email.trim()) : [],
            phones: fields[7] ? fields[7].split(';').filter(phone => phone.trim()) : []
          };
          contacts.push(contact);
        }
      } catch (e) {
        console.error(`Failed to parse contact line: ${line.substring(0, 100)}...`);
        // Continue processing other contacts
      }
    }

    return contacts;
  }

  async getContactsDataUnlimited() {
    // Only do permission check on first access to avoid delays
    if (!this.permissionsChecked) {
      try {
        await this.checkPermissions();
        this.permissionsChecked = true;
        console.error(`Initial permissions check passed`);
      } catch (error) {
        console.error(`Permission check failed: ${error.message}`);
        throw error;
      }
    }

    // Same as getContactsData but without the contact limit
    const script = `
      tell application "Contacts"
        set contactList to {}
        repeat with aPerson in people
          try
            -- Get basic info with safe defaults
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

            -- Get emails (concatenated with semicolons)
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

            -- Get phones (concatenated with semicolons)
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

            -- Create tab-delimited record
            set contactRecord to personName & tab & firstName & tab & lastName & tab & org & tab & noteText & tab & birthdayText & tab & emailText & tab & phoneText
            set end of contactList to contactRecord
          end try
        end repeat

        -- Return newline-delimited list
        set AppleScript's text item delimiters to return
        set result to contactList as text
        set AppleScript's text item delimiters to ""
        return result
      end tell
    `;

    const result = await this.executeAppleScript(script);
    if (!result) {
      console.error(`No result returned from AppleScript`);
      return [];
    }

    // Parse the tab-delimited data in JavaScript
    try {
      const contacts = this.parseContactsFromDelimitedData(result);
      console.error(`Successfully parsed ${contacts.length} contacts from AppleScript (unlimited)`);
      return contacts;
    } catch (e) {
      console.error(`Contact parsing failed: ${e.message}`);
      console.error(`Result was: ${result.substring(0, 500)}...`);
      return [];
    }
  }

  formatContact(contact) {
    return {
      name: contact.name || 'Unknown',
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      emails: contact.emails || [],
      phones: contact.phones || [],
      organization: contact.organization || null,
      notes: contact.note || null,
      birthday: contact.birthday || null
    };
  }

  matchesQuery(contact, query) {
    if (!query) return true;

    const searchText = query.toLowerCase();
    const searchableFields = [
      contact.name,
      contact.firstName,
      contact.lastName,
      contact.organization,
      contact.note,
      ...(contact.emails || []),
      ...(contact.phones || [])
    ].filter(Boolean);

    return searchableFields.some(field =>
      field.toLowerCase().includes(searchText)
    );
  }

  matchesField(contact, field, value, exactMatch = false) {
    if (!value) return true;

    const contactValue = contact[field];
    if (!contactValue) return false;

    const searchValue = value.toLowerCase();
    const contactValueLower = contactValue.toLowerCase();

    return exactMatch ?
      contactValueLower === searchValue :
      contactValueLower.includes(searchValue);
  }

  matchesArrayField(contact, fieldArray, value, exactMatch = false) {
    if (!value || !contact[fieldArray]) return false;

    const searchValue = value.toLowerCase();
    return contact[fieldArray].some(item => {
      const itemValue = typeof item === 'string' ? item : String(item);
      return exactMatch ?
        itemValue.toLowerCase() === searchValue :
        itemValue.toLowerCase().includes(searchValue);
    });
  }

  isUpcomingBirthday(birthday, days) {
    if (!birthday || !days || birthday === "") return false;

    try {
      const birthDate = new Date(birthday);
      const today = new Date();
      const currentYear = today.getFullYear();

      // Create birthday for this year
      const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

      // If birthday already passed this year, check next year
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(currentYear + 1);
      }

      const timeDiff = thisYearBirthday.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return daysDiff >= 0 && daysDiff <= days;
    } catch (e) {
      return false;
    }
  }

  async searchContacts(args) {
    // Efficient search using AppleScript's native filtering to search ENTIRE address book
    await this.checkPermissions();
    console.error(`Searching contacts with query: "${args.query || 'all'}"`);

    // If no query provided, get first few contacts
    if (!args.query) {
      const searchScript = `tell application "Contacts" to return name of people`;
      try {
        const result = await this.executeAppleScript(searchScript);
        const names = result.includes(',') ?
          result.split(',').map(name => name.trim()).filter(name => name).slice(0, 50) :
          result.split(/[\r\n]+/).filter(name => name.trim()).slice(0, 50);

        console.error(`Found ${names.length} contacts`);
        const namesList = names.map((name, index) => `${index + 1}. ${name}`).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `First ${names.length} contacts:\n\n${namesList}\n\n(Searched entire address book using efficient AppleScript filtering)`
            }
          ]
        };
      } catch (error) {
        console.error(`Contact search failed: ${error.message}`);
        throw error;
      }
    }

    // Search with query using efficient whose syntax
    const searchQuery = args.query.replace(/"/g, '\\"');
    const searchScript = `tell application "Contacts" to return name of (every person whose name contains "${searchQuery}")`;

    try {
      const result = await this.executeAppleScript(searchScript);
      const names = result.includes(',') ?
        result.split(',').map(name => name.trim()).filter(name => name) :
        result.split(/[\r\n]+/).filter(name => name.trim());

      console.error(`Found ${names.length} matching contacts`);

      if (names.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No contacts found matching "${args.query}".`
            }
          ]
        };
      }

      const namesList = names.map((name, index) => `${index + 1}. ${name}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${names.length} contacts matching "${args.query}":\n\n${namesList}\n\n(Searched entire address book using efficient AppleScript filtering)`
          }
        ]
      };
    } catch (error) {
      console.error(`Contact search failed: ${error.message}`);
      throw error;
    }
  }

  async getContactByName(args) {
    // Simple name search using direct AppleScript approach that works
    await this.checkPermissions();
    console.error(`Searching for contacts with name: "${args.name}"`);

                        // Use the working approach - search entire address book efficiently
    const searchName = args.name.replace(/"/g, '\\"');

    const searchScript = args.exact_match ?
      `tell application "Contacts" to return name of (every person whose name = "${searchName}")` :
      `tell application "Contacts" to return name of (every person whose name contains "${searchName}")`;

    try {
      const result = await this.executeAppleScript(searchScript);
      const names = result.split(/[\r\n]+/).filter(name => name.trim());

      console.error(`Found ${names.length} matching contacts`);

      if (names.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No contacts found with name "${args.name}".`
            }
          ]
        };
      }

      const namesList = names.map((name, index) => `${index + 1}. ${name}`).join('\n');

              return {
          content: [
            {
              type: 'text',
              text: `Found ${names.length} contacts with name "${args.name}":\n\n${namesList}\n\n(Searched entire address book using efficient AppleScript filtering)`
            }
          ]
        };
    } catch (error) {
      console.error(`Name search failed: ${error.message}`);
      throw error;
    }
  }







  async getAllContacts(args) {
    // For getAllContacts, bypass the 200 contact limit if user explicitly wants more
    const contactsList = args.unlimited ?
      await this.getContactsDataUnlimited() :
      await this.getContactsData();
    const limit = args.limit || 100;

    const limited = contactsList.slice(0, limit);
    const results = limited.map(contact => this.formatContact(contact));

    return {
      content: [
        {
          type: 'text',
          text: `Retrieved ${results.length} contacts${contactsList.length > limit ? ` (limited from ${contactsList.length} total)` : ''}:\n\n${JSON.stringify(results, null, 2)}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Contacts MCP server started successfully on stdio');
  }
}

// Export the class for testing
export { ContactsServer };

// Start the server only if this file is run directly
import { fileURLToPath } from 'url';

// Simple check for direct execution vs import
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const server = new ContactsServer();
  server.run().catch(console.error);
}
