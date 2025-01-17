import { Model, Schema, Writable } from '@contember/schema'
import {
	acceptFieldVisitor,
	DefaultNamingConventions,
	isInverseRelation,
	NamingConventions,
	NamingHelper,
	resolveDefaultColumnType,
} from '../model'

export class TsDefinitionGenerator {
	private static reservedWords = new Set(['do', 'if', 'in', 'for', 'let', 'new', 'try', 'var', 'case', 'else', 'enum', 'eval', 'null', 'this', 'true', 'void', 'with', 'await', 'break', 'catch', 'class', 'const', 'false', 'super', 'throw', 'while', 'yield', 'delete', 'export', 'import', 'public', 'return', 'static', 'switch', 'typeof', 'default', 'extends', 'finally', 'package', 'private', 'continue', 'debugger', 'function', 'arguments', 'interface', 'protected', 'implements', 'instanceof'])

	constructor(
		private readonly schema: Schema,
		private readonly conventions: NamingConventions = new DefaultNamingConventions(),
	) {
	}

	public generate() {
		const enums = Object.entries(this.schema.model.enums).map(([name, values]) => this.generateEnum({
			name,
			values,
		})).join('')
		const entities = Object.values(this.schema.model.entities).map(entity => this.generateEntity({ entity })).join('')
		return `import { SchemaDefinition as def } from '@contember/schema-definition'
${enums}${entities}`
	}

	private generateEnum({ name, values }: { name: string; values: readonly string[] }): string {
		return `\nexport const ${this.formatIdentifier(name)} = def.createEnum(${values.map(it => this.formatLiteral(it)).join(', ')})\n`
	}


	public generateEntity({ entity }: { entity: Model.Entity }): string {
		const decorators = [
			...Object.values(entity.unique).map(constraint => this.generateUniqueConstraint({ entity, constraint })),
			...Object.values(entity.indexes).map(index => this.generateIndex({ entity, index })),
			this.generateView({ entity }),
		].filter(it => !!it).map(it => `${it}\n`).join('')

		return `\n${decorators}export class ${this.formatIdentifier(entity.name)} {
${Object.values(entity.fields).map(field => this.generateField({ field, entity })).filter(it => !!it).join('\n')}
}\n`
	}

	private generateUniqueConstraint({ entity, constraint }: { entity: Model.Entity; constraint: Model.UniqueConstraint }): string {
		const defaultName = NamingHelper.createUniqueConstraintName(entity.name, constraint.fields)
		if (defaultName === constraint.name) {
			const fieldsList = `${constraint.fields.map(it => this.formatLiteral(it)).join(', ')}`
			return `@def.Unique(${fieldsList})`
		}
		return `@def.Unique(${this.formatLiteral(constraint)})`
	}

	private generateIndex({ entity, index }: { entity: Model.Entity; index: Model.Index }): string {
		const defaultName = NamingHelper.createIndexName(entity.name, index.fields)
		if (defaultName === index.name) {
			const fieldsList = `${index.fields.map(it => this.formatLiteral(it)).join(', ')}`
			return `@def.Index(${fieldsList})`
		}
		return `@def.Index(${this.formatLiteral(index)})`
	}

	private generateView({ entity }: { entity: Model.Entity }): string | undefined {
		if (!entity.view) {
			return undefined
		}

		const dependenciesExpr = (entity.view.dependencies?.length ?? 0) > 0
			? `, {\n\tdependencies: () => [${entity.view.dependencies?.map(it => this.formatIdentifier(it))}]\n}`
			: ''

		return `@def.View(\`${entity.view.sql}\`${dependenciesExpr})`
	}

	public generateField({ entity, field }: { entity: Model.Entity; field: Model.AnyField }): string | undefined {
		const formatRelationFactory = (method: string, relation: Model.AnyRelation) => {
			const otherSide = isInverseRelation(relation) ? relation.ownedBy : relation.inversedBy
			const otherSideFormatted = otherSide ? `, ${this.formatLiteral(otherSide)}` : ''
			return `${method}(${this.formatIdentifier(relation.target)}${otherSideFormatted})`
		}
		const formatEnumRef = (enumName: string, enumValues: Record<string, string>, providedValue?: string, defaultValue?: string): string | undefined => {
			if (!providedValue || providedValue === defaultValue) {
				return undefined
			}
			const enumValueKey = Object.entries(Model.OrderDirection).find(dir => dir[1] === providedValue)?.[0]
			if (!enumValueKey) {
				throw new Error(`Value ${providedValue} is not defined in enum ${enumName}`)
			}
			return `${enumName}.${enumValueKey}`

		}
		const formatOrderBy = (orderBy?: readonly Model.OrderBy[]) => {
			return orderBy?.map(it => {
				const enumExpr = formatEnumRef(`Model.OrderDirection`, Model.OrderDirection, it.direction, Model.OrderDirection.asc)
				return `orderBy(${this.formatLiteral(it.path)}${enumExpr ? `, ${enumExpr}` : ''})`
			}) ?? []
		}
		const formatOnDelete = (onDelete?: Model.OnDelete): string | undefined => {
			if (onDelete === Model.OnDelete.cascade) {
				return 'cascadeOnDelete()'
			}
			if (onDelete === Model.OnDelete.setNull) {
				return 'setNullOnDelete()'
			}
			return undefined
		}
		const formatJoiningColumn = (joiningColumnName: string, fieldName: string): string | undefined => {
			const defaultJoiningColumn = this.conventions.getJoiningColumnName(fieldName)
			if (defaultJoiningColumn === joiningColumnName) {
				return undefined
			}
			return `joiningColumn(${this.formatLiteral(joiningColumnName)})`
		}
		const definition = acceptFieldVisitor<(string | undefined)[]>(this.schema.model, entity, field, {
			visitColumn: ctx => {
				return this.generateColumn(ctx)
			},
			visitOneHasMany: ({ relation }) => {
				return [
					formatRelationFactory('oneHasMany', relation),
					...formatOrderBy(relation.orderBy),
				]
			},
			visitManyHasOne: ({ relation }) => {
				return [
					formatRelationFactory('manyHasOne', relation),
					!relation.nullable ? 'notNull()' : undefined,
					formatOnDelete(relation.joiningColumn.onDelete),
					formatJoiningColumn(relation.joiningColumn.columnName, relation.name),
				]
			},
			visitOneHasOneInverse: ({ relation }) => {
				return [
					formatRelationFactory('oneHasOneInverse', relation),
					!relation.nullable ? 'notNull()' : undefined,
				]
			},
			visitOneHasOneOwning: ({ relation }) => {
				return [
					formatRelationFactory('oneHasOne', relation),
					!relation.nullable ? 'notNull()' : undefined,
					formatOnDelete(relation.joiningColumn.onDelete),
					formatJoiningColumn(relation.joiningColumn.columnName, relation.name),
					relation.orphanRemoval ? 'removeOrphan()' : undefined,
				]
			},
			visitManyHasManyOwning: ({ entity, relation }) => {
				const columnNames = this.conventions.getJoiningTableColumnNames(
					entity.name,
					relation.name,
					relation.target,
					relation.inversedBy,
				)
				const defaultJoiningTable = this.conventions.getJoiningTableName(entity.name, relation.name)
				const joiningTable: Writable<Partial<Model.JoiningTable>> = {}
				if (relation.joiningTable.tableName !== defaultJoiningTable) {
					joiningTable.tableName = relation.joiningTable.tableName
				}
				if (!relation.joiningTable.eventLog.enabled) {
					joiningTable.eventLog = { enabled: false }
				}
				if (columnNames[0] !== relation.joiningTable.joiningColumn.columnName || relation.joiningTable.joiningColumn.onDelete !== Model.OnDelete.cascade) {
					joiningTable.joiningColumn = {
						columnName: relation.joiningTable.joiningColumn.columnName,
						onDelete: relation.joiningTable.joiningColumn.onDelete,
					}
				}
				if (columnNames[1] !== relation.joiningTable.inverseJoiningColumn.columnName || relation.joiningTable.inverseJoiningColumn.onDelete !== Model.OnDelete.cascade) {
					joiningTable.inverseJoiningColumn = {
						columnName: relation.joiningTable.inverseJoiningColumn.columnName,
						onDelete: relation.joiningTable.inverseJoiningColumn.onDelete,
					}
				}

				return [
					formatRelationFactory('manyHasMany', relation),
					...formatOrderBy(relation.orderBy),
					Object.keys(joiningTable).length > 0 ? `joiningTable(${this.formatLiteral(joiningTable)})` : undefined,
				]
			},
			visitManyHasManyInverse: ({ relation }) => {
				return [
					formatRelationFactory('manyHasManyInverse', relation),
					...formatOrderBy(relation.orderBy),
				]
			},
		})
		const definitionCode = definition.filter(it => !!it).join('.')
		if (field.name === 'id' && definitionCode === 'uuidColumn().notNull()') {
			return undefined
		}
		return `\t${this.formatIdentifier(field.name)} = def.${definitionCode}`
	}

	private generateColumn({ entity, column }: { entity: Model.Entity; column: Model.AnyColumn }): string[] {
		let parts: string[] = []
		if (column.type === Model.ColumnType.Enum) {
			parts.push(`enumColumn(${column.columnType})`)
		} else {
			parts.push(`${ColumnToMethodMapping[column.type]}()`)
			const defaultColumnType = resolveDefaultColumnType(column.type)
			if (defaultColumnType !== column.columnType) {
				parts.push(`columnType(${this.formatLiteral(column.columnType)})`)
			}
		}
		const defaultColumnName = this.conventions.getColumnName(column.name)
		if (defaultColumnName !== column.columnName) {
			parts.push(`columnName(${this.formatLiteral(column.columnName)})`)
		}
		if (!column.nullable) {
			parts.push('notNull()')
		}
		if (column.default !== undefined) {
			parts.push(`default(${this.formatLiteral(column.default)})`)
		}
		if (column.typeAlias) {
			parts.push(`typeAlias(${this.formatLiteral(column.typeAlias)})`)
		}


		// todo: sequence
		// todo: maybe single column unique()

		return parts
	}

	private formatIdentifier(id: string): string {
		// todo: validate
		return id
	}

	private formatLiteral(value: any): string {
		if (value === undefined || value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'function') {
			return String(value)
		}
		if (typeof value === 'bigint') {
			return value.toString(10) + 'n'
		}
		if (typeof value === 'string') {
			return `'${value.replaceAll(/'/g, '\\\'')}'`
		}
		if (Array.isArray(value)) {
			return `[${value.map(it => this.formatLiteral(it)).join(', ')}]`
		}
		return `{${Object.entries(value).map(([key, value]) => {
			const formattedKey = this.isSimpleIdentifier(key) ? key : `[${this.formatLiteral(key)}]`
			return `${formattedKey}: ${this.formatLiteral(value)}`
		}).join(', ')}`
	}
	private isValidIdentifier(identifier: string): boolean {
		if (!this.isSimpleIdentifier(identifier)) {
			return false
		}
		return !TsDefinitionGenerator.reservedWords.has(identifier)
	}

	private isSimpleIdentifier(identifier: string): boolean {
		return !!identifier.match(/^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/)
	}
}

const ColumnToMethodMapping: {
	[K in Exclude<Model.ColumnType, Model.ColumnType.Enum>]: string
} = {
	[Model.ColumnType.Bool]: 'boolColumn',
	[Model.ColumnType.Date]: 'dateColumn',
	[Model.ColumnType.DateTime]: 'dateTimeColumn',
	[Model.ColumnType.Json]: 'jsonColumn',
	[Model.ColumnType.Double]: 'doubleColumn',
	[Model.ColumnType.Uuid]: 'uuidColumn',
	[Model.ColumnType.Int]: 'intColumn',
	[Model.ColumnType.String]: 'stringColumn',
}
