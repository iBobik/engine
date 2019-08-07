import { assertNever } from 'cms-common'
import * as React from 'react'
import { CompleteMarkerProvider, MarkerProvider, SyntheticChildrenProvider } from '../../coreComponents'
import { Environment } from '../../dao'

function Component<P extends {}>(
	statelessRender: React.FunctionComponent<P>,
	displayName?: string,
): React.NamedExoticComponent<P> & SyntheticChildrenProvider<P>
function Component<P extends {}>(
	statefulRender: React.FunctionComponent<P>,
	generateSyntheticChildren: (props: P, environment: Environment) => React.ReactNode,
	displayName?: string,
): React.NamedExoticComponent<P> & SyntheticChildrenProvider<P>
function Component<P extends {}>(
	statefulRender: React.FunctionComponent<P>,
	markerProvisions: MarkerProvider<P>,
	displayName?: string,
): React.NamedExoticComponent<P> & MarkerProvider<P>
function Component<P extends {}>(
	render: React.FunctionComponent<P>,
	decider?: string | ((props: P, environment: Environment) => React.ReactNode) | MarkerProvider<P>,
	displayName?: string,
) {
	const augmentedRender: React.NamedExoticComponent<P> & MarkerProvider<P> = React.memo<P>(render)
	const defaultName = 'UserComponent'

	if (decider === undefined || typeof decider === 'string') {
		augmentedRender.displayName = decider || defaultName
		augmentedRender.generateSyntheticChildren = render

		return augmentedRender as React.NamedExoticComponent<P> & SyntheticChildrenProvider<P>
	}

	augmentedRender.displayName = displayName || defaultName

	if (typeof decider === 'function') {
		augmentedRender.generateSyntheticChildren = decider

		return augmentedRender
	}
	if (typeof decider === 'object') {
		for (const provisionName in decider as CompleteMarkerProvider<P>) {
			const methodName = provisionName as keyof MarkerProvider<P>
			;(augmentedRender[methodName] as MarkerProvider<P>[typeof methodName]) = decider[methodName]
		}

		return augmentedRender
	}
	return assertNever(decider)
}

export { Component }
