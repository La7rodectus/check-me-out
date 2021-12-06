const ConnectionsController = require('./connectionsController/connectionsController.js');
const SqlTable = require('./db_structs/sqlTable.js');

const defaultOptions = {
  driver: 'mysql',

};

//data base controller
class DBC {
  constructor(conn_obj, options) {
    this.options = { ...defaultOptions, ...options };
    this.parser = new (require(`./db_structs/parsers/${this.options.driver}SchemaParser.js`))();
    this.dbdv = options.Dbdv || require(`./dataValidators/${this.options.driver}DataValidator.js`); // DatabaseDataValidator
    this.cc = new ConnectionsController(conn_obj); // ConnectionController
    this.schema = undefined;
  }

  #assignSchema(schema) {
    const tables = schema.getTables();
    for (const table of Object.values(tables)) {
      this[table.name] = new SqlTable(this, table);
    }
  }

  async init(dbSchema) {
    try {
      const {conn, err} = await this.getConnection();
      if (err) throw err;
      this.schema = dbSchema ? dbSchema : await this.parser.queryDbSchema(conn);
      conn.release();
      this.#assignSchema(this.schema);
      this.dbdv = new this.options.Dbdv(this.schema);
    } catch (err) {
      return err;
    }
  }

  getSchema() {
    return this.schema;
  }

  async getConnection() {
    return await this.cc.getConnection();
  }

}

module.exports = DBC;
