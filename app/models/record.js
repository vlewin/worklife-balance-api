const dynamoose = require('dynamoose')
const schema = require('./schemas/record')
const Timestamp = require('./timestamp')
const datetime = require("../helpers/datetime");

module.exports = class Record extends Timestamp {
  constructor(data) {
    super(data)
  }

  static get connection () {
    return dynamoose.model(process.env.RECORDS_TABLE || 'records-development', schema, { update: true })
  }

  static async findById (userId) {
    console.log('NOTE: findById', userId)
    const response = await this.connection.query({ user_id: { eq: userId } }).exec()
    return response
  }

  static async findByMonth (userId, month) {
    console.log('NOTE: findByMonth', month)
    const response = await this.connection.query({
      user_id: { eq: userId }
    }).where(
      { month: { eq: month }
    }).exec()

    return response

    // return this.connection.query({ user_id: {eq: user_id }}).where({ month: {eq: month }}).exec(function (err, records) {
    //   console.log(err)
    //   if(err) console.log(err)
    //
    //   console.log(user_id, month, '=>', records.length);
    //   // Look at all the beagles
    // });
  }

  static async findByWeek (userId, week) {
    console.log('NOTE: findByWeek', userId, week)
    // const response = await this.connection.query({
    //   user_id: { eq: userId }
    // }).where({
    //   week: { eq: week }
    // }).exec()
    const range = datetime.getStartEndByISOWeek(week)
    const response = await this.connection.query({
      user_id: { eq: userId }
    }).where({
      type: { eq: 'presence' }
    }).filter('timestamp').between(range[0], range[1]).exec()

    return response
  }

  static async all (params = {}) {
    let response = []

    if (params.user_id && params.week) {
      response = await Record.findByWeek(params.user_id, params.week)
    } else if (params.user_id && params.month) {
      response = await Record.findByMonth(params.user_id, params.month)
    } else {
      response = await this.findById(params.user_id)
    }

    return response
  }

  static async create (params = {}) {
    console.log('*** .create() -', params)
    let response = {}
    if (Array.isArray(params)) {
      response = await this.connection.batchPut(params)
    } else {
      response = await new this.connection(params).save()
    }

    console.log('*** .create() - response', response)
    return response
  }

  async save() {
    console.log('*** #save()')
    const response = await this.constructor.create(this.data)
    return response
  }
}
