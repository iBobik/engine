import { assertNever, Validation } from 'cms-common'
import * as validation from './index'

class DependencyCollector {
	public collect(validator: Validation.Validator): DependencyCollector.Dependencies {
		return this.doCollect(validator, [])
	}

	private doCollect(validator: Validation.Validator, prefix: string[]): DependencyCollector.Dependencies {
		if (validator.operation === validation.InContextOperation) {
			const validatorArg = validator.args[1] as Validation.ValidatorArgument
			const pathArg = validator.args[0] as Validation.PathArgument

			const newPrefix = [...prefix, ...pathArg.path]
			const dependencies = this.doCollect(validatorArg.validator, newPrefix)

			return [newPrefix, ...dependencies]
		}

		const result: DependencyCollector.Dependencies = []
		for (const arg of validator.args) {
			switch (arg.type) {
				case Validation.ArgumentType.path:
					result.push([...prefix, ...arg.path])
					break
				case Validation.ArgumentType.validator:
					result.push(...this.doCollect(arg.validator, prefix))
					break
				case Validation.ArgumentType.literal:
					break
				default:
					assertNever(arg)
			}
		}
		return result
	}
}

namespace DependencyCollector {
	export type Dependency = string[]
	export type Dependencies = Dependency[]
}

export default DependencyCollector