import * as Knex from 'knex'
import KnexWrapper from './KnexWrapper'

export default class KnexConnection {
	constructor(private readonly knex: Knex) {}

	async transaction<T>(transactionScope: (trx: Knex.Transaction) => Promise<T> | void): Promise<T> {
		return await this.knex.transaction(transactionScope)
	}

	queryBuilder(): Knex.QueryBuilder {
		return this.knex.queryBuilder()
	}

	raw(sql: string): Knex.Raw {
		return this.knex.raw(sql)
	}

	wrapper(): KnexWrapper {
		return new KnexWrapper(this.knex)
	}
}
