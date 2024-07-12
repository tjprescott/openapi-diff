import { SwaggerParser } from "./parser.js";

/** The registry to look up the name within. */
export enum RegistryKind {
  Definition,
  Parameter,
  Response,
  SecurityDefinition,
}

/** A class which contains all defintions which can be referenced in a spec. */
export class DefinitionRegistry {
  private parser: SwaggerParser;
  private definitions = new Map<string, any>();
  private parameters = new Map<string, any>();
  private responses = new Map<string, any>();
  private securityDefinitions = new Map<string, any>();
  private unresolvedReferences = new Set<string>();
  private swaggerMap: Map<string, any>;

  constructor(map: Map<string, any>, parser: SwaggerParser) {
    this.parser = parser;
    this.swaggerMap = map;
  }

  initialize() {
    this.#gatherReferences(this.swaggerMap);
    this.#revisitReferences(this.swaggerMap);
  }

  #gatherReferences(map: Map<string, any>) {
    try {
      for (const [filename, data] of map.entries()) {
        // Gather definitions
        for (const [name, value] of Object.entries(data.definitions ?? {})) {
          if (this.definitions.has(name)) {
            throw new Error(`Duplicate definition: ${name}`);
          }
          this.definitions.set(name, this.parser.parse(value));
        }
        // Gather parameter definitions
        for (const [name, value] of Object.entries(data.parameters ?? {})) {
          if (this.parameters.has(name)) {
            throw new Error(`Duplicate parameter: ${name}`);
          }
          this.parameters.set(name, this.parser.parse(value));
        }
        // Gather responses
        for (const [name, value] of Object.entries(data.responses ?? {})) {
          if (this.responses.has(name)) {
            throw new Error(`Duplicate response: ${name}`);
          }
          this.responses.set(name, this.parser.parse(value));
        }
        // Gather security definitions
        for (const [name, value] of Object.entries(
          data.securityDefinitions ?? {}
        )) {
          if (this.securityDefinitions.has(name)) {
            throw new Error(`Duplicate security definition: ${name}`);
          }
          this.securityDefinitions.set(name, this.parser.parse(value));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  #revisitReferences(map: Map<string, any>) {
    // Second path through should clear up any unresolved forward references.
    // It will NOT solve any circular references!
    this.resetUnresolvedReferences();
    for (const [name, value] of this.definitions.entries()) {
      const expanded = this.parser.parse(value);
      this.definitions.set(name, expanded);
    }
    for (const [name, value] of this.parameters.entries()) {
      const expanded = this.parser.parse(value);
      this.parameters.set(name, expanded);
    }
    for (const [name, value] of this.responses.entries()) {
      const expanded = this.parser.parse(value);
      this.responses.set(name, expanded);
    }
    for (const [name, value] of this.securityDefinitions.entries()) {
      const expanded = this.parser.parse(value);
      this.securityDefinitions.set(name, expanded);
    }
  }

  /** Search a registry for a specific key. */
  get(name: string, registry: RegistryKind): any | undefined {
    switch (registry) {
      case RegistryKind.Definition:
        return this.definitions.get(name);
      case RegistryKind.Parameter:
        return this.parameters.get(name);
      case RegistryKind.Response:
        return this.responses.get(name);
      case RegistryKind.SecurityDefinition:
        return this.securityDefinitions.get(name);
      default:
        return (
          this.definitions.get(name) ??
          this.parameters.get(name) ??
          this.responses.get(name) ??
          this.securityDefinitions.get(name)
        );
    }
  }

  /** Logs an unresolved reference. */
  logUnresolvedReference(ref: string) {
    this.unresolvedReferences.add(ref);
  }

  /** Clears the list of unresolved references. */
  resetUnresolvedReferences() {
    this.unresolvedReferences.clear();
  }

  /** Returns unresolved references. */
  getUnresolvedReferences(): string[] {
    return Array.from(this.unresolvedReferences);
  }
}
