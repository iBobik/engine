import * as React from 'react'
import { DataContext } from '../../coreComponents'
import { EntityCollectionAccessor } from '../../dao'
import { PersistButton } from '../buttons'
import { RendererProps } from './CommonRendererProps'
import { FeedbackRenderer } from './FeedbackRenderer'
import { DefaultRenderer } from './DefaultRenderer'

export class NoUiRenderer extends React.PureComponent<RendererProps> {
	public render() {
		return (
			<FeedbackRenderer data={this.props.data}>
				{data => {
					const normalizedData = data.root instanceof EntityCollectionAccessor ? data.root.entities : [data.root]

					return (
						<>
							{normalizedData.map(
								value =>
									value && (
										<DataContext.Provider value={value} key={value.getKey()}>
											{DefaultRenderer.renderTitle(this.props.title)}
											{this.props.children}
										</DataContext.Provider>
									),
							)}
							<PersistButton />
						</>
					)
				}}
			</FeedbackRenderer>
		)
	}
}