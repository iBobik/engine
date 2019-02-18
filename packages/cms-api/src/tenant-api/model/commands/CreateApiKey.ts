import Command from './Command'
import * as crypto from 'crypto'
import ApiKey from '../type/ApiKey'
import { uuid } from '../../../utils/uuid'
import { now } from '../../../utils/date'
import KnexWrapper from '../../../core/knex/KnexWrapper'
import ApiKeyHelper from './ApiKeyHelper'

class CreateApiKey implements Command<CreateApiKey.Result> {
	private readonly type: ApiKey.Type
	private readonly identityId: string
	private readonly expiration: number | undefined

	constructor(type: ApiKey.Type.SESSION, identityId: string, expiration?: number)
	constructor(type: ApiKey.Type, identityId: string)
	constructor(type: ApiKey.Type, identityId: string, expiration?: number) {
		this.type = type
		this.identityId = identityId
		this.expiration = expiration
	}

	async execute(db: KnexWrapper): Promise<CreateApiKey.Result> {
		const apiKeyId = uuid()
		const token = await this.generateToken()
		const tokenHash = ApiKey.computeTokenHash(token)

		await db
			.insertBuilder()
			.into('api_key')
			.values({
				id: apiKeyId,
				token_hash: tokenHash,
				type: this.type,
				identity_id: this.identityId,
				enabled: true,
				expires_at: ApiKeyHelper.getExpiration(this.type, this.expiration),
				expiration: this.expiration || null,
				created_at: now(),
			})
			.execute()

		return new CreateApiKey.Result(apiKeyId, token)
	}

	private generateToken(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			crypto.randomBytes(20, (error, buffer) => {
				if (error) {
					reject(error)
				} else {
					resolve(buffer.toString('hex'))
				}
			})
		})
	}
}

namespace CreateApiKey {
	export class Result {
		constructor(public readonly id: string, public readonly token: string) {}
	}
}

export default CreateApiKey
