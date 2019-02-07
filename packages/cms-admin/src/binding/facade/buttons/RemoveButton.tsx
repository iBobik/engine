import * as React from 'react'
import { Icon } from '@blueprintjs/core'
import { IconNames, IconName } from '@blueprintjs/icons'
import { DataContext, DataContextValue } from '../../coreComponents'
import { EntityAccessor } from '../../dao'
import { Button, ButtonProps } from '../../../components'

export interface RemoveButtonProps extends ButtonProps {
	removeType?: RemoveButton.RemovalType
	icon?: IconName
}

class RemoveButton extends React.Component<RemoveButtonProps> {
	public render() {
		const { removeType, icon, ...rest } = this.props
		return (
			<DataContext.Consumer>
				{(value: DataContextValue) => {
					if (value instanceof EntityAccessor) {
						return (
							<Button
								{...rest}
								onClick={() => value.remove && value.remove(this.mapToRemovalType(this.props.removeType))}
								small
							>
								<Icon icon={icon || IconNames.DELETE} />
							</Button>
						)
					}
				}}
			</DataContext.Consumer>
		)
	}

	private mapToRemovalType(removalType?: RemoveButton.RemovalType): EntityAccessor.RemovalType {
		switch (removalType) {
			case 'disconnect':
				return EntityAccessor.RemovalType.Disconnect
			case 'delete':
				return EntityAccessor.RemovalType.Delete
			default:
				// By default, we just unlink unless explicitly told to actually delete
				return EntityAccessor.RemovalType.Disconnect
		}
	}
}

namespace RemoveButton {
	// This enum is technically useless but it allows users to avoid importing EntityAccessor.RemovalType
	export type RemovalType = 'disconnect' | 'delete'
}

export { RemoveButton }