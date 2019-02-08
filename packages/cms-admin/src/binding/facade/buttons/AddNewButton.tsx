import * as React from 'react'
import { Icon } from '@blueprintjs/core'
import { IconNames, IconName } from '@blueprintjs/icons'
import { EntityCollectionAccessor } from '../../dao'
import { Button, ButtonProps } from '../../../components'

export interface AddNewButtonProps extends ButtonProps {
	addNew: EntityCollectionAccessor['addNew']
	icon?: IconName
}

export class AddNewButton extends React.PureComponent<AddNewButtonProps> {
	public render() {
		const { addNew, icon, ...rest } = this.props
		return (
			addNew && (
				<Button onClick={addNew} small {...rest}>
					<Icon icon={icon || IconNames.ADD} />
				</Button>
			)
		)
	}
}
