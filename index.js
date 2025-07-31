#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { analyzeConsistency, parsePCBExport, exportResults } from './consistency-analyzer.js';

const program = new Command();

program
  .name('pcb-consistency-checker')
  .description('Standalone consistency checker for PedagogicCaseBuilder case files')
  .version('1.0.0');

program
  .command('check')
  .description('Analyze a PCB case file for inconsistencies')
  .argument('<file>', 'Path to PCB JSON export file')
  .option('-k, --api-key <key>', 'OpenAI API key (or set OPENAI_API_KEY env var)')
  .option('-o, --output <file>', 'Output file path (default: writes to console)')
  .option('-f, --format <format>', 'Output format: json, markdown, csv', 'json')
  .option('-m, --model <model>', 'OpenAI model to use', 'gpt-4')
  .option('--temperature <temp>', 'AI temperature (0.0-1.0)', '0.3')
  .option('--max-tokens <tokens>', 'Maximum response tokens', '2000')
  .option('--dry-run', 'Parse file but skip AI analysis (for testing)')
  .action(async (file, options) => {
    try {
      console.log('🚀 PedagogicCaseBuilder Consistency Checker v1.0.0');
      console.log('📁 Input file:', file);
      
      // Check if file exists
      try {
        await fs.access(file);
      } catch (error) {
        console.error('❌ Error: File not found:', file);
        process.exit(1);
      }
      
      // Read and parse PCB export
      console.log('📖 Reading PCB export file...');
      const fileContent = await fs.readFile(file, 'utf8');
      let jsonData;
      
      try {
        jsonData = JSON.parse(fileContent);
      } catch (error) {
        console.error('❌ Error: Invalid JSON file');
        console.error('   Make sure this is a valid PedagogicCaseBuilder export file');
        process.exit(1);
      }
      
      // Parse PCB format
      const { caseFile, metadata } = parsePCBExport(jsonData);
      console.log('📊 Case file info:');
      console.log(`   Components: ${caseFile.size}`);
      console.log(`   Export type: ${metadata.exportType}`);
      console.log(`   Exported: ${new Date(metadata.exportedAt).toLocaleString()}`);
      
      // Check if case file has content
      const componentsWithContent = Array.from(caseFile.values()).filter(c => c.content && c.content.trim());
      if (componentsWithContent.length === 0) {
        console.log('⚠️  Warning: No components with content found. Nothing to analyze.');
        process.exit(0);
      }
      
      console.log(`✅ Found ${componentsWithContent.length} components with content to analyze`);
      
      // Dry run mode - just parse and exit
      if (options.dryRun) {
        console.log('🏃 Dry run mode - skipping AI analysis');
        console.log('✅ File parsed successfully. Ready for analysis.');
        return;
      }
      
      // Get API key
      const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('❌ Error: OpenAI API key required');
        console.error('   Use --api-key <key> or set OPENAI_API_KEY environment variable');
        process.exit(1);
      }
      
      // Run consistency analysis
      console.log('🤖 Starting AI consistency analysis...');
      console.log(`   Model: ${options.model}`);
      console.log(`   Temperature: ${options.temperature}`);
      
      const analysisOptions = {
        model: options.model,
        temperature: parseFloat(options.temperature),
        max_tokens: parseInt(options.maxTokens)
      };
      
      const result = await analyzeConsistency(caseFile, apiKey, analysisOptions);
      
      // Format output
      const output = exportResults(result, options.format);
      
      // Write or display results
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log('📄 Results written to:', options.output);
      } else {
        console.log('\n' + '='.repeat(60));
        console.log('CONSISTENCY ANALYSIS RESULTS');
        console.log('='.repeat(60) + '\n');
        console.log(output);
      }
      
      // Summary
      console.log('\n' + '='.repeat(40));
      console.log('📊 ANALYSIS SUMMARY');
      console.log('='.repeat(40));
      console.log(`Components analyzed: ${result.statistics.totalComponents}`);
      console.log(`Content length: ${result.statistics.contentLength} characters`);
      console.log(`Inconsistencies found: ${result.statistics.inconsistenciesFound}`);
      console.log(`Analysis completed: ${new Date(result.analyzedAt).toLocaleString()}`);
      
      if (result.statistics.inconsistenciesFound > 0) {
        console.log('\n⚠️  Issues found - review the analysis above');
        process.exit(1);
      } else {
        console.log('\n✅ No inconsistencies found - case appears consistent!');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      if (error.message.includes('API key')) {
        console.error('   Check your OpenAI API key and billing status');
      } else if (error.message.includes('rate limit')) {
        console.error('   OpenAI rate limit hit - wait a moment and try again');
      } else if (error.message.includes('timeout')) {
        console.error('   Request timed out - try again or use a smaller case file');
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a PCB export file format')
  .argument('<file>', 'Path to PCB JSON export file')
  .action(async (file) => {
    try {
      console.log('🔍 Validating PCB export file:', file);
      
      const fileContent = await fs.readFile(file, 'utf8');
      const jsonData = JSON.parse(fileContent);
      const { caseFile, metadata } = parsePCBExport(jsonData);
      
      console.log('✅ Valid PCB export file');
      console.log(`   Components: ${caseFile.size}`);
      console.log(`   Export type: ${metadata.exportType}`);
      console.log(`   Version: ${metadata.version}`);
      console.log(`   Exported: ${new Date(metadata.exportedAt).toLocaleString()}`);
      
      // Show component breakdown
      const componentsByType = {};
      for (const component of caseFile.values()) {
        componentsByType[component.type] = (componentsByType[component.type] || 0) + 1;
      }
      
      console.log('\n📊 Component breakdown:');
      Object.entries(componentsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();