export class Connector {
  constructor(config = {}) {
    this.config = config;
  }

  async testConnection() {
    throw new Error('testConnection() deve ser implementado pelo conector.');
  }

  async pull() {
    return { records: [], checkpoint: null };
  }

  async push() {
    return { accepted: 0, rejected: 0, details: [] };
  }
}

export class ConnectorRegistry {
  constructor() {
    this.factories = new Map();
  }

  register(type, factory) {
    this.factories.set(type, factory);
  }

  create(type, config) {
    const factory = this.factories.get(type);
    if (!factory) throw new Error(`Conector não registrado: ${type}`);
    return factory(config);
  }

  types() {
    return [...this.factories.keys()];
  }
}
