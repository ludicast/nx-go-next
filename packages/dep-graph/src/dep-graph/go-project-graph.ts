import { DependencyType, ProjectGraph, ProjectGraphBuilder, ProjectGraphProcessorContext } from '@nrwl/devkit'
import * as execa from 'execa'
import { join } from 'path'

function deriveNxProjectNameFromGoImportPath(workspaceGoModule: string, goPackageImportPath: string) {
  return `${goPackageImportPath.replace(`${workspaceGoModule}/`, '').replace(/\//g, '-')}`
}

/**
 * Nx Project Graph plugin for go
 *
 * @param {ProjectGraph} graph
 * @param {ProjectGraphProcessorContext} context
 * @returns {ProjectGraph}
 */
exports.processProjectGraph = (graph: ProjectGraph, context: ProjectGraphProcessorContext): ProjectGraph => {
  const builder = new ProjectGraphBuilder(graph)

  const completedSubprocess = execa.sync('go', ['run', join(__dirname, 'get-package-metadata.go')])

  const firstPartyData = JSON.parse(completedSubprocess.stdout)
  const workspaceGoModule = firstPartyData[0].Module.Path

  for (const pkg of firstPartyData) {
    const projectName = deriveNxProjectNameFromGoImportPath(workspaceGoModule, pkg.ImportPath)

    for (const depImportPath of pkg.Deps) {
      const depProjectName = deriveNxProjectNameFromGoImportPath(workspaceGoModule, depImportPath)
      builder.addDependency(DependencyType.static, projectName, depProjectName)
    }
  }

  return builder.getProjectGraph()
}
