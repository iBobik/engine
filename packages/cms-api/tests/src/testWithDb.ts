import { Model } from 'cms-common'
import { createMock } from '../../src/utils/testing'
import MigrationsResolver from '../../src/content-schema/MigrationsResolver'
import Migration from '../../src/system-api/model/migrations/Migration'
import ModificationHandlerFactory from '../../src/system-api/model/migrations/modifications/ModificationHandlerFactory'
import SchemaMigrator from '../../src/content-schema/differ/SchemaMigrator'
import SchemaDiffer from '../../src/system-api/model/migrations/SchemaDiffer'
import { emptySchema } from '../../src/content-schema/schemaUtils'
import ApiTester from './ApiTester'
import { testUuid, withMockedUuid } from './testUuid'
import { expect } from 'chai'
import SelectBuilder from '../../src/core/database/SelectBuilder'

type Test = {
	schema: Model.Schema
	seed: {
		query: string
		queryVariables?: Record<string, any>
	}[]
	query: string
	queryVariables?: Record<string, any>
	expectDatabase?: Record<string, Record<string, any>[]>
} & ({ return: object } | { throws: { message: string } })

export const executeDbTest = async (test: Test) => {
	const modificationFactory = new ModificationHandlerFactory(ModificationHandlerFactory.defaultFactoryMap)
	const schemaMigrator = new SchemaMigrator(modificationFactory)
	const schemaDiffer = new SchemaDiffer(schemaMigrator)
	const modifications = schemaDiffer.diffSchemas(emptySchema, {
		model: test.schema,
		acl: { roles: {}, variables: {} },
		validation: {},
	})

	const migrationsResolver = createMock<MigrationsResolver>({
		getMigrations(): Promise<Migration[]> {
			return Promise.resolve([{ version: '201907221000-init', modifications }])
		},
	})

	const tester = await ApiTester.create({
		migrationsResolver,
		project: {
			stages: [
				{
					id: testUuid(1),
					name: 'Prod',
					slug: 'prod',
				},
			],
		},
	})
	await tester.stages.createAll()
	await tester.stages.migrate('201907221000-init')
	await withMockedUuid(async () => {
		for (const { query, queryVariables } of test.seed) {
			await tester.content.queryContent('prod', query, queryVariables)
		}
		try {
			const response = await tester.content.queryContent('prod', test.query, test.queryVariables)
			if ('return' in test) {
				expect(response).deep.equal(test.return)
			}
		} catch (e) {
			if ('throws' in test) {
				expect(e.message).eq(test.throws.message)
			} else {
				throw e
			}
		}

		const dbData: Record<string, Record<string, any>[]> = {}
		for (const table of Object.keys(test.expectDatabase || {})) {
			const qb = tester.client
				.forSchema('stage_prod')
				.selectBuilder()
				.from(table)

			const columns = Object.keys((test.expectDatabase || {})[table][0] || { id: null })
			const qbWithSelect = columns.reduce<SelectBuilder<Record<string, any>, 'from' | 'select'>>(
				(qb, column) => qb.select(column),
				qb
			)
			dbData[table] = await qbWithSelect.getResult()
		}
		expect(dbData).deep.eq(test.expectDatabase)
	})
}