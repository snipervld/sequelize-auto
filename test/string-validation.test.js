const { expect } = require('chai');
const { describe, it } = require('mocha');
const { AutoGenerator } = require('../lib/auto-generator');
const { TableData } = require('../lib/types');

// Mock dialect options for testing
const mockDialectOptions = {
  name: 'postgres',
  hasSchema: true,
  getForeignKeysQuery: () => '',
  countTriggerQuery: () => '',
  isPrimaryKey: () => false,
  isSerialKey: () => false,
  showViewsQuery: () => '',
  getStringBounds: (sqType) => {
    if (!sqType) return null;

    const sizeMatch = sqType.match(/\((\d+)\)/);
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : null;

    if (sqType.startsWith('DataTypes.STRING')) {
      return { min: 0, max: size || 255 };
    }
    if (sqType.startsWith('DataTypes.CHAR')) {
      return { min: 0, max: size || 255 };
    }
    if (sqType.startsWith('DataTypes.TEXT')) {
      return { min: 0, max: null }; // Unbounded
    }
    return null;
  }
};

function createMockTableData(fields, tableName = 'test_table') {
  const tableData = new TableData();
  tableData.tables = {
    [tableName]: fields
  };
  tableData.foreignKeys = { 'test_table': {} };
  tableData.hasTriggerTables = {};
  tableData.indexes = {};
  tableData.relations = [];
  return tableData;
}

function createOptions(overrides = {}) {
  return Object.assign({
    spaces: true,
    indentation: 2,
    lang: 'es5',
    singularize: false,
    useDefine: false,
    directory: './models',
    additional: {}
  }, overrides);
}

describe('sequelize-auto string validation', function() {

  describe('AutoGenerator with string validation disabled', function() {
    it('should NOT generate validation when validationRules is not set', function() {
      const tableData = createMockTableData({
        username: {
          type: 'VARCHAR(100)',
          allowNull: false,
          primaryKey: false
        }
      });

      const options = createOptions();
      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      expect(result['test_table']).to.not.include('validate:');
      expect(result['test_table']).to.not.include('len:');
    });

    it('should NOT generate validation when createValidationMessageOnStringDataTypeOverFlow is false', function() {
      const tableData = createMockTableData({
        username: {
          type: 'VARCHAR(100)',
          allowNull: false,
          primaryKey: false
        }
      });

      const options = createOptions({
        validationRules: []
      });

      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      expect(result['test_table']).to.not.include('validate:');
      expect(result['test_table']).to.not.include('len:');
    });
  });

  describe('AutoGenerator with string validation enabled', function() {
    it('should generate validation with default message when enabled', function() {
      const tableData = createMockTableData({
        username: {
          type: 'VARCHAR(100)',
          allowNull: false,
          primaryKey: false
        }
      });

      const options = createOptions({
        validationRules: [
          {
            type: 'stringLengthCheck'
          }
        ]
      });

      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      expect(result['test_table']).to.include('validate:');
      expect(result['test_table']).to.include('len:');
      expect(result['test_table']).to.include('args: [0, 100]');
      expect(result['test_table']).to.include('Field test_table.username may not exceed 100 characters. Original DataType: DataTypes.STRING(100).');
    });

    it('should generate validation with custom message template', function() {
      const tableData = createMockTableData({
        email: {
          type: 'VARCHAR(255)',
          allowNull: true,
          primaryKey: false
        }
      });

      const options = createOptions({
        validationRules: [
          {
            type: 'stringLengthCheck',
            errorMessageTemplate: 'Field "{fieldName}" must be between {minBound} and {maxBound} characters'
          }
        ]
      });

      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      expect(result['test_table']).to.include('validate:');
      expect(result['test_table']).to.include('len:');
      expect(result['test_table']).to.include('args: [0, 255]');
      expect(result['test_table']).to.include('Field "email" must be between 0 and 255 characters');
    });

    it('should generate validation with custom message template, schema included', function() {
      const tableData = createMockTableData({
        email: {
          type: 'VARCHAR(255)',
          allowNull: true,
          primaryKey: false
        }
      }, 'schema.test_table');

      const options = createOptions({
        validationRules: [
          {
            type: 'stringLengthCheck',
            errorMessageTemplate: '{tableName}: Field "{fieldName}" must be between {minBound} and {maxBound} characters'
          }
        ]
      });

      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      expect(result['schema.test_table']).to.include('validate:');
      expect(result['schema.test_table']).to.include('len:');
      expect(result['schema.test_table']).to.include('args: [0, 255]');
      expect(result['schema.test_table']).to.include('schema.test_table: Field "email" must be between 0 and 255 characters');
    });

    it('should NOT generate validation for TEXT type (unbounded)', function() {
      const tableData = createMockTableData({
        description: {
          type: 'TEXT',
          allowNull: true,
          primaryKey: false
        }
      });

      const options = createOptions({
        validationRules: [
          {
            type: 'stringLengthCheck'
          }
        ]
      });

      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      // TEXT has null max bound, so validation should not be generated
      expect(result['test_table']).to.not.include('validate:');
      expect(result['test_table']).to.not.include('len:');
    });

    it('should generate validation for multiple string fields', function() {
      const tableData = createMockTableData({
        firstName: {
          type: 'VARCHAR(50)',
          allowNull: false,
          primaryKey: false
        },
        lastName: {
          type: 'VARCHAR(50)',
          allowNull: false,
          primaryKey: false
        },
        age: {
          type: 'INTEGER',
          allowNull: true,
          primaryKey: false
        }
      });

      const options = createOptions({
        validationRules: [
          {
            type: 'stringLengthCheck'
          }
        ]
      });

      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      // Should have validation for firstName and lastName
      expect(result['test_table']).to.include('Field test_table.firstName may not exceed 50 characters. Original DataType: DataTypes.STRING(50).');
      expect(result['test_table']).to.include('Field test_table.lastName may not exceed 50 characters. Original DataType: DataTypes.STRING(50).');

      // age is INTEGER, should not have string validation
      const ageSection = result['test_table'].split('age:')[1];
      if (ageSection) {
        const ageBlock = ageSection.split('},')[0];
        expect(ageBlock).to.not.include('validate:');
      }
    });

    it('should generate validation for CHAR type', function() {
      const tableData = createMockTableData({
        countryCode: {
          type: 'CHAR(2)',
          allowNull: false,
          primaryKey: false
        }
      });

      const options = createOptions({
        validationRules: [
          {
            type: 'stringLengthCheck'
          }
        ]
      });

      const generator = new AutoGenerator(tableData, mockDialectOptions, options);
      const result = generator.generateText();

      expect(result['test_table']).to.include('validate:');
      expect(result['test_table']).to.include('args: [0, 2]');
    });
  });
});
