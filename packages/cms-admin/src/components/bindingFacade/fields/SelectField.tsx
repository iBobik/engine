import { FormGroup, FormGroupProps } from '@contember/ui'
import * as React from 'react'
import { Component, Environment, ErrorAccessor, FieldName } from '../../../binding'
import { Select } from '../../ui'

import { ChoiceField, ChoiceFieldData, ChoiceFieldProps } from './ChoiceField'

export interface SelectFieldPublicProps extends Omit<FormGroupProps, 'children'> {
	name: FieldName
	firstOptionCaption?: React.ReactNode
	options: ChoiceFieldProps['options']
	allowNull?: boolean
	children?: ChoiceFieldProps['optionFieldFactory']
}

export type SelectFieldProps = SelectFieldPublicProps

export const SelectField = Component<SelectFieldProps>(props => {
	return (
		<ChoiceField
			name={props.name}
			options={props.options}
			arity={ChoiceFieldData.ChoiceArity.Single}
			optionFieldFactory={props.children}
		>
			{({ data, currentValue, onChange, environment, isMutating, errors }: ChoiceFieldData.SingleChoiceFieldMetadata) => {
				return (
					<SelectFieldInner
						label={props.label}
						allowNull={props.allowNull}
						firstOptionCaption={props.firstOptionCaption}
						data={data}
						currentValue={currentValue}
						onChange={onChange}
						environment={environment}
						errors={errors}
						isMutating={isMutating}
					/>
				)
			}}
		</ChoiceField>
	)
}, 'SelectField')

export interface SelectFieldInnerProps
	extends Omit<SelectFieldPublicProps, 'options' | 'name'>,
		Omit<ChoiceFieldData.SingleChoiceFieldMetadata, 'fieldName'> {
	environment: Environment
	errors: ErrorAccessor[]
	isMutating: boolean
}

export class SelectFieldInner extends React.PureComponent<SelectFieldInnerProps> {
	public render() {
		const options = Array<Select.Option>({
			disabled: this.props.allowNull !== true,
			value: -1,
			label: this.props.firstOptionCaption || this.props.label || '',
		}).concat(
			this.props.data.map(({ key, label }) => {
				return {
					disabled: false,
					value: key,
					label: label,
				}
			}),
		)

		return (
			<FormGroup
				{...this.props}
				label={this.props.environment.applySystemMiddleware('labelMiddleware', this.props.label)}
			>
				<Select
					value={this.props.currentValue.toString()}
					onChange={event => {
						this.props.onChange(parseInt(event.currentTarget.value, 10))
					}}
					options={options}
					disabled={this.props.isMutating}
				/>
			</FormGroup>
		)
	}
}