import {
  apply,
  mergeWith,
  move,
  type Rule,
  type SchematicContext,
  type Tree,
  url,
} from '@angular-devkit/schematics';

interface MapOptions {
  path: string;
}

/**
 * Copies the ng-mapcn map component sources (shadcn-style) into the consumer
 * project so they can be freely customized.
 */
export function map(options: MapOptions): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    context.logger.info(`Copying ng-mapcn map components to ${options.path}`);
    return mergeWith(apply(url('./files'), [move(options.path)]));
  };
}
