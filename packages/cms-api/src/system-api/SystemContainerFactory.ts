import StagesQueryResolver from './resolvers/query/StagesQueryResolver'
import DiffResponseBuilder from './model/events/DiffResponseBuilder'
import DiffQueryResolver from './resolvers/query/DiffQueryResolver'
import SystemApolloServerFactory from '../http/SystemApolloServerFactory'
import Container from '../core/di/Container'
import TableReferencingResolver from './model/events/TableReferencingResolver'
import ResolverFactory from './resolvers/ResolverFactory'
import { IResolvers } from 'graphql-tools'
import PermissionsFactory from '../tenant-api/model/authorization/PermissionsFactory'
import Authorizator from '../core/authorization/Authorizator'
import AccessEvaluator from '../core/authorization/AccessEvalutator'
import ReleaseMutationResolver from './resolvers/mutation/ReleaseMutationResolver'
import MigrationFilesManager from '../migrations/MigrationFilesManager'
import PermissionsByIdentityFactory from '../acl/PermissionsByIdentityFactory'
import SystemExecutionContainer from './SystemExecutionContainer'
import MigrationsResolver from '../content-schema/MigrationsResolver'
import Project from '../config/Project'
import SchemaMigrator from '../content-schema/differ/SchemaMigrator'
import MigrationDiffCreator from './model/migrations/MigrationDiffCreator'
import MigrationExecutor from './model/migrations/MigrationExecutor'
import ProjectInitializer from './ProjectInitializer'
import SchemaVersionBuilder from '../content-schema/SchemaVersionBuilder'
import SchemaDiffer from './model/migrations/SchemaDiffer'
import StageMigrator from './StageMigrator'
import ModificationHandlerFactory from './model/migrations/modifications/ModificationHandlerFactory'
import KnexWrapper from '../core/knex/KnexWrapper'

export interface SystemContainer {
	systemApolloServerFactory: SystemApolloServerFactory
	systemResolvers: IResolvers
	authorizator: Authorizator
	executionContainerFactory: SystemExecutionContainer.Factory,
	projectIntializer: ProjectInitializer,
	migrationDiffCreator: MigrationDiffCreator,
}

export default class SystemContainerFactory {
	public create(container: {
		project: Project,
		migrationFilesManager: MigrationFilesManager
		permissionsByIdentityFactory: PermissionsByIdentityFactory
		schemaMigrationDiffsResolver: MigrationsResolver,
		schemaMigrator: SchemaMigrator,
		schemaVersionBuilder: SchemaVersionBuilder,
		modificationHandlerFactory: ModificationHandlerFactory,
		systemKnexWrapper: KnexWrapper,
	}): Container<SystemContainer> {
		return new Container.Builder({})
			.addService('schemaDiffer', () => new SchemaDiffer(container.schemaMigrator))
			.addService('systemStagesQueryResolver', () => new StagesQueryResolver())
			.addService('tableReferencingResolver', () => new TableReferencingResolver())
			.addService('accessEvaluator', ({}) => new AccessEvaluator.PermissionEvaluator(new PermissionsFactory().create()))
			.addService('authorizator', ({ accessEvaluator }): Authorizator => new Authorizator.Default(accessEvaluator))

			.addService('systemDiffResponseBuilder', () => new DiffResponseBuilder())
			.addService(
				'systemDiffQueryResolver',
				({ systemDiffResponseBuilder }) => new DiffQueryResolver(systemDiffResponseBuilder)
			)
			.addService('releaseMutationResolver', () => new ReleaseMutationResolver())
			.addService(
				'systemResolvers',
				({ systemStagesQueryResolver, systemDiffQueryResolver, releaseMutationResolver }) =>
					new ResolverFactory(systemStagesQueryResolver, systemDiffQueryResolver, releaseMutationResolver).create()
			)
			.addService('migrationExecutor', () => new MigrationExecutor(container.modificationHandlerFactory))
			.addService(
				'executionContainerFactory',
				({ authorizator, migrationExecutor }) =>
					new SystemExecutionContainer.Factory(
						container.project,
						container.schemaMigrationDiffsResolver.resolve(),
						container.migrationFilesManager,
						authorizator,
						container.permissionsByIdentityFactory,
						container.schemaMigrator,
						migrationExecutor
					)
			)
			.addService(
				'systemApolloServerFactory',
				({ systemResolvers, authorizator, executionContainerFactory }) =>
					new SystemApolloServerFactory(systemResolvers, authorizator, executionContainerFactory)
			)
			.addService('migrationDiffCreator', ({ schemaDiffer }) =>
				new MigrationDiffCreator(container.migrationFilesManager, container.schemaVersionBuilder, schemaDiffer))

			.addService('stageMigrator', ({ migrationExecutor }) =>
				new StageMigrator(container.systemKnexWrapper, container.schemaMigrationDiffsResolver.resolve(), migrationExecutor, container.schemaVersionBuilder))
			.addService('projectIntializer', ({ stageMigrator }) =>
				new ProjectInitializer(container.systemKnexWrapper, container.project, stageMigrator))
			.build()
			.pick('systemApolloServerFactory', 'systemResolvers', 'authorizator', 'executionContainerFactory', 'projectIntializer', 'migrationDiffCreator')
	}
}
