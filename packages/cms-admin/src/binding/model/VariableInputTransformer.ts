import { GraphQlBuilder } from 'cms-client'
import { assertNever } from 'cms-common'
import { Filter, Scalar, VariableInput } from '../bindingTypes'
import { DataBindingError, Environment, Literal, VariableLiteral, VariableScalar } from '../dao'

export class VariableInputTransformer {
	public static transformFilter(
		input: Filter | undefined,
		environment: Environment
	): Filter<GraphQlBuilder.Literal> | undefined {
		if (input === undefined) {
			return undefined
		}
		return VariableInputTransformer.transformWhere(input, environment) as Filter<GraphQlBuilder.Literal>
	}

	private static transformWhere = (
		where: VariableInputTransformer.Where<VariableInput>,
		environment: Environment
	): VariableInputTransformer.Where<GraphQlBuilder.Literal> => {
		const mapped: VariableInputTransformer.Where<GraphQlBuilder.Literal> = {}

		for (const key in where) {
			const field = where[key]

			if (
				typeof field === 'string' ||
				typeof field === 'boolean' ||
				typeof field === 'number' ||
				field === null ||
				field === undefined
			) {
				mapped[key] = field
			} else if (Array.isArray(field)) {
				mapped[key] = field.map(item => VariableInputTransformer.transformWhere(item, environment))
			} else if (field instanceof VariableScalar) {
				mapped[key] = VariableInputTransformer.transformVariableScalar(field, environment)
			} else if (field instanceof VariableLiteral) {
				mapped[key] = VariableInputTransformer.transformVariableLiteral(field, environment)
			} else if (field instanceof Literal) {
				mapped[key] = field
			} else if (typeof field === 'object') {
				mapped[key] = VariableInputTransformer.transformWhere(field, environment)
			} else {
				assertNever(field)
			}
		}

		return mapped
	}

	public static transformValue(
		value: VariableInput | Scalar,
		environment: Environment
	): GraphQlBuilder.Literal | Scalar {
		if (value instanceof VariableScalar) {
			return VariableInputTransformer.transformVariableScalar(value, environment)
		} else if (value instanceof VariableLiteral) {
			return VariableInputTransformer.transformVariableLiteral(value, environment)
		} else {
			return value
		}
	}

	public static transformVariableScalar(variableScalar: VariableScalar, environment: Environment): Scalar {
		const value = environment.getValue(variableScalar.variable)

		if (typeof value !== 'string' && typeof value !== 'boolean' && typeof value !== 'number' && value !== null) {
			throw new DataBindingError(
				`The value of the '${variableScalar.variable}' must be a scalar or null, not '${typeof value}'.`
			)
		}
		return value
	}

	public static transformVariableLiteral(
		variableLiteral: VariableLiteral,
		environment: Environment
	): GraphQlBuilder.Literal {
		const value = environment.getValue(variableLiteral.variable)

		if (typeof value !== 'string') {
			throw new DataBindingError(
				`The value of the '${variableLiteral.variable}' must be a string, not '${typeof value}'.`
			)
		}

		return new GraphQlBuilder.Literal(value)
	}
}

namespace VariableInputTransformer {
	export type Where<T> = {
		[name: string]: T | Scalar | undefined | Where<T> | Where<T>[]
	}
}