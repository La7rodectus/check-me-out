const Procedures = require('./db_structs/procedures.js');
const ConnectionsController = require('./connectionsController/connectionsController.js').default;
const DatabaseDataValidator = require('./dataValidator.js').default;
const SqlTable = require('./db_structs/sqlTable.js').default;

const defaultOptions = {
  Dbdv: DatabaseDataValidator,
};

//data base controller
class DBC {
  #conn = undefined;

  constructor(conn_obj, options = {}) {
    this.dbdv = options.Dbdv;                            // DatabaseDataValidator
    this.cc = new ConnectionsController(conn_obj);       // ConnectionController
    this.options = { ...defaultOptions, ...options };
    this.schema = undefined;

  }

  init = (dbSchema) => new Promise(async (resolve, reject) => {
    try {
      if (!this.#conn) {
        const {conn, err} = await this.getConnection();
        if (err) throw err;
        this.#conn = conn;
      }
      const schema = dbSchema ? dbSchema : await this.queryDbSchema();
      this.schema = schema;
      this.dbdv = new this.options.Dbdv(this.schema);
      resolve();
    } catch (err) {
      reject(err);
    }
  });

  getSchema() {
    return this.schema;
  }

  async getConnection() {
    return await this.cc.getConnection();
  }

  // creates object from db schema
  queryDbSchema = () => new Promise(async (resolve, reject) => {
    try {
      const schema = {
        name: null,
        tables: {},
      };
      const data = await Procedures.getBaseTableNames(this.#conn);
      const tableNames = [];
      for (const row of data) tableNames.push(row['table_name']);
      const promises = [];
      for (const tName of tableNames) {
        promises.push(Procedures.descTable(this.#conn, tName));
      }
      Promise.all(promises).then((data) => {
        if (data.length === 0) throw new Error('Empty Tables!');
        for (let i = 0; i < tableNames.length; i++) {
          const tableFields = data[i];
          schema.tables[tableNames[i]] = {
            fields: {},
            FK: [],
            PK: undefined,
          };
          for (const fieldRow of tableFields) {
            const isNull = fieldRow.Null === 'YES' ? null : '';
            schema.tables[tableNames[i]].fields[fieldRow.Field] = fieldRow.Type + `|${isNull}`;
            if (fieldRow.Key === 'PRI') schema.tables[tableNames[i]].PK = fieldRow.Field;
            else if (fieldRow.Key === 'MUL') schema.tables[tableNames[i]].FK.push(fieldRow.Field);
          }
          const tableData = schema.tables[tableNames[i]];
          tableData.name = tableNames[i];
          this[tableNames[i]] = new SqlTable(this, tableData);
        }
        resolve(schema);
      });
    } catch (err) {
      reject(err);
    }
  });

  // insertBank = (updateObj) => Procedures.insertIntoTable(this._conn, 'Banks', updateObj);

  // updateBankByName = (name, updateObj) => Procedures.updateTable(this._conn, 'Banks', 'bankName', name, updateObj);

  // deleteFromBankByName = (name) => Procedures.deleteRowsFromTable(this._conn, 'Banks', 'bankName', name);

  // getAllBanks = () => Procedures.getAllFromTable(this._conn, 'Banks');

  // getBankByName = (name) => Procedures.getFromTableBy(this._conn, 'Banks', 'bankName', name);

}

module.exports.default = DBC;
