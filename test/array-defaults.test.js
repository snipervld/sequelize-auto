const { expect } = require('chai');
const { describe, it } = require('mocha');
const { AutoGenerator } = require('../lib/auto-generator');
const { TableData } = require('../lib/types');

const mockDialectOptions = {
  name: 'postgres',
  hasSchema: true,
  getForeignKeysQuery: () => '',
  countTriggerQuery: () => '',
  isPrimaryKey: () => false,
  isSerialKey: () => false,
  showViewsQuery: () => '',
  getStringBounds: () => null
};

function createMockTableData(field, tableName = 'test_table') {
  const tableData = new TableData();
  tableData.tables = {
    [tableName]: {
      f: Object.assign({ allowNull: false, primaryKey: false, autoIncrement: false, comment: null }, field)
    }
  };
  tableData.foreignKeys = { [tableName]: {} };
  tableData.hasTriggerTables = {};
  tableData.indexes = {};
  tableData.relations = [];
  return tableData;
}

function createOptions(overrides = {}) {
  return Object.assign({
    spaces: true,
    indentation: 2,
    lang: 'ts',
    singularize: false,
    useDefine: false,
    directory: './models',
    additional: {}
  }, overrides);
}

function generate(field) {
  const tableData = createMockTableData(field);
  const generator = new AutoGenerator(tableData, mockDialectOptions, createOptions());
  return generator.generateText()['test_table'];
}

describe('sequelize-auto array defaults', function() {

  it('emits a valid empty array for the ARRAY[] constructor default', function() {
    const result = generate({ type: 'ARRAY', elementType: 'ENUM', special: ['a', 'b'], defaultValue: 'ARRAY[]' });
    expect(result).to.include('defaultValue: []');
    expect(result).to.not.include('ARRAY[]');
  });

  it('emits a valid empty array for the {} literal default', function() {
    const result = generate({ type: 'ARRAY', elementType: 'ENUM', special: ['a', 'b'], defaultValue: '{}' });
    expect(result).to.include('defaultValue: []');
  });

  it('quotes enum elements of a non-empty {a,b} literal default', function() {
    const result = generate({ type: 'ARRAY', elementType: 'ENUM', special: ['a', 'b'], defaultValue: '{a,b}' });
    expect(result).to.include('defaultValue: ["a","b"]');
  });

  it('strips casts and quotes from an ARRAY[...] constructor default', function() {
    const result = generate({ type: 'ARRAY', elementType: 'ENUM', special: ['a', 'b'], defaultValue: "ARRAY['a'::x, 'b'::x]" });
    expect(result).to.include('defaultValue: ["a","b"]');
  });

  it('keeps numeric array elements unquoted', function() {
    const result = generate({ type: 'ARRAY', elementType: 'integer', defaultValue: '{1,2}' });
    expect(result).to.include('defaultValue: [1,2]');
  });

  it('parenthesizes a union element type in the TypeScript array type', function() {
    const result = generate({ type: 'ARRAY', elementType: 'ENUM', special: ['a', 'b'], defaultValue: 'ARRAY[]' });
    expect(result).to.include('("a" | "b")[]');
    expect(result).to.not.include('"b"[]');
  });

});
