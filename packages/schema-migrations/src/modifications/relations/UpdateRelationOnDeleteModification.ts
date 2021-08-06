import { MigrationBuilder } from '@contember/database-migrations'
import { Model, Schema } from '@contember/schema'
import { ContentEvent } from '@contember/engine-common'
import { SchemaUpdater, updateEntity, updateField, updateModel } from '../schemaUpdateUtils'
import { ModificationHandlerStatic } from '../ModificationHandler'

export const UpdateRelationOnDeleteModification: ModificationHandlerStatic<UpdateRelationOnDeleteModificationData> = class {
	static id = 'updateRelationOnDelete'
	constructor(private readonly data: UpdateRelationOnDeleteModificationData, private readonly schema: Schema) {}

	public createSql(builder: MigrationBuilder): void {}

	public getSchemaUpdater(): SchemaUpdater {
		const { entityName, fieldName, onDelete } = this.data
		return updateModel(
			updateEntity(
				entityName,
				updateField<Model.AnyRelation & Model.JoiningColumnRelation>(fieldName, field => ({
					...field,
					joiningColumn: { ...field.joiningColumn, onDelete },
				})),
			),
		)
	}

	public transformEvents(events: ContentEvent[]): ContentEvent[] {
		return events
	}

	describe() {
		return { message: `Change on-delete policy of relation ${this.data.entityName}.${this.data.fieldName}` }
	}

	static createModification(data: UpdateRelationOnDeleteModificationData) {
		return { modification: this.id, ...data }
	}
}

export interface UpdateRelationOnDeleteModificationData {
	entityName: string
	fieldName: string
	onDelete: Model.OnDelete
}
