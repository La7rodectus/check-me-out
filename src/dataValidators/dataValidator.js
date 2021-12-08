const validators = require('./baseValidators.js');

const DEFAULT_VALIDATORS_CREATORS = {
  int: [validators.createIntBaseValidator],
  varchar: [validators.createStringBaseValidator],
  char: [validators.createStringBaseValidator],
};

class DatabaseDataValidator {
  constructor(schema) {
    this.validationSchema = this.#parseSchema(schema);
  }

  validate = (tableName, field, val) => this.#callValidators(tableName, field, val);

  #callValidators(tableName, field, val) {
    const validators = this.validationSchema.tables[tableName][field];
    for (const validator of validators) {
      if (!validator(val)) return false;
    }
    return true;
  }

  #parseSchema(inputSchema) {
    const schema = JSON.parse(JSON.stringify(inputSchema));
    const tables = schema.tables;
    for (const tableName in tables) {
      const table = tables[tableName];
      const tableValidator = {};
      const tableFields = table.fields;
      for (const field in tableFields) {
        let rowType = tableFields[field];
        tableValidator[field] = this.#createValidationFunc(rowType);
      }
      schema.tables[tableName] = tableValidator;
    }
    return schema;
  }

  #createValidationFunc(rowType) {
    const typeRegEx = /^[a-zA-Z]+/g;
    const [type] = rowType.match(typeRegEx);
    const creators = DEFAULT_VALIDATORS_CREATORS[type];
    return creators.map((creator => creator(rowType)));
  }

}

module.exports = DatabaseDataValidator;