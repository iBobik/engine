import {
	MutationAddIdpArgs,
	MutationResolvers,
	AddIdpResponse,
	MutationUpdateIdpArgs,
	UpdateIdpResponse,
} from '../../../schema'
import { GraphQLResolveInfo } from 'graphql'
import { ResolverContext } from '../../ResolverContext'
import { PermissionActions } from '../../../model'
import { IDPManager } from '../../../model/service/idp/IDPManager'
import { createErrorResponse } from '../../errorUtils'

export class UpdateIDPMutationResolver implements MutationResolvers {
	constructor(private readonly idpManager: IDPManager) {
	}

	async updateIDP(
		parent: any,
		args: MutationUpdateIdpArgs,
		context: ResolverContext,
		info: GraphQLResolveInfo,
	): Promise<UpdateIdpResponse> {
		await context.requireAccess({
			action: PermissionActions.IDP_ADD,
			message: 'You are not allowed to add IDP',
		})
		const result = await this.idpManager.updateIDP(context.db, args.identityProvider, {
			configuration: args.configuration,
			options: {
				autoSignUp: args.options?.autoSignUp ?? undefined,
			},
		})
		if (!result.ok) {
			return createErrorResponse(result.error, result.errorMessage)
		}

		return { ok: true }
	}
}