import { AuthorizationScope, Authorizator } from '@contember/authorization'
import { Acl } from '@contember/schema'
import { ForbiddenError } from 'apollo-server-errors'
import { DatabaseContext } from '../model'
import { ProjectConfig } from '../types'
import { Identity } from '../model/authorization'

export class ResolverContextFactory {
	constructor(private readonly authorizator: Authorizator<Identity>) {}

	public create(
		systemDbContext: DatabaseContext,
		project: ProjectConfig,
		identity: Identity,
		variables: Acl.VariablesMap,
	): ResolverContext {
		return {
			project,
			identity,
			variables,
			authorizator: this.authorizator,
			db: systemDbContext,
			isAllowed: async (scope, action) => await this.authorizator.isAllowed(identity, scope, action),
			requireAccess: async (scope, action, message?) => {
				if (!(await this.authorizator.isAllowed(identity, scope, action))) {
					throw new ForbiddenError(message || 'Forbidden')
				}
			},
		}
	}
}

export interface ResolverContext {
	readonly project: ProjectConfig
	readonly identity: Identity
	readonly db: DatabaseContext
	readonly variables: Acl.VariablesMap
	readonly authorizator: Authorizator<Identity>
	readonly isAllowed: (scope: AuthorizationScope<Identity>, action: Authorizator.Action) => Promise<boolean>
	readonly requireAccess: (
		scope: AuthorizationScope<Identity>,
		action: Authorizator.Action,
		message?: string,
	) => Promise<void>
}
