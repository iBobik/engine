class Container<M extends Container.ServiceTypeMap> {
  private readonly services: Partial<M> = {}
  private readonly accessors: Readonly<M> = {} as any

  constructor(private factories: Container.ServiceFactoryMap<M>) {
    Object.keys(this.factories).forEach(name => {
      Object.defineProperty(this.accessors, name, {
        get: this.get.bind(this, name)
      })
    })
  }

  get<N extends keyof M>(name: N): M[N] {
    if (this.services[name] === undefined) {
      this.services[name] = this.factories[name](this.accessors)
    }

    return this.services[name]
  }
}

namespace Container {
  export type ServiceName = string
  export type ServiceType = any

  export type ServiceTypeMap = {
    [N in ServiceName]: ServiceType|undefined
  }

  export type ServiceFactory<M extends ServiceTypeMap, T> =
    (accessors: Readonly<M>) => T

  export type ServiceFactoryMap<M extends ServiceTypeMap> = {
    [N in keyof M]: ServiceFactory<M, M[N]>
  }

  export class Builder<M extends ServiceTypeMap> {
    constructor(private factories: ServiceFactoryMap<M>) {
    }

    addService<N extends Exclude<ServiceName, keyof M>, T extends ServiceType>(name: N, factory: ServiceFactory<M, T>): Builder<M & { [K in N]: T }> {
      type TypeMapA = M
      type TypeMapB = { [K in N]: T }
      type ExtendedTypeMap = TypeMapA & TypeMapB

      type FactoryMapA = ServiceFactoryMap<TypeMapA>
      type FactoryMapB = ServiceFactoryMap<TypeMapB>
      type ExtendedFactoryMap = ServiceFactoryMap<ExtendedTypeMap>

      const factoryMapA: FactoryMapA = this.factories
      const factoryMapB: FactoryMapB = {[name]: factory} as any as FactoryMapB
      const extendedFactoryMap = Object.assign(factoryMapB, factoryMapA) as any as ExtendedFactoryMap

      return new Builder(extendedFactoryMap)
    }

    build(): Container<M> {
      return new Container(this.factories)
    }
  }
}

export default Container
