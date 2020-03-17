const core = require('@actions/core');
const github = require('@actions/github');

// [TO-DO] Make it smarter later on
const languagesEcosystems = [
    {   language: 'Ruby',
        ecosystem: 'RUBYGEMS',
        file: 'Gemfile'
    },
    {   language: 'Javascript',
        ecosystem: 'NPM',
        file: 'package.json'
    },
    {   language: 'Python',
        ecosystem: 'PIP',
        file: 'requirements.txt'
    },
    {   language: 'Java',
        ecosystem: 'MAVEN',
        file: 'pom.xml'
    },
    {   language: 'C#',
        ecosystem: 'NUGET',
        file: '.nuspec'
    },
    {   language: 'PHP',
        ecosystem: 'COMPOSER',
        file: 'composer.json'
    }
]

/*
 * Get a specific vulerability
 * @params package(String):   full URI of the package 
 * @params ecosystem(String): ecosystem from the list [RUBYGEMS,NPM,PIP,MAVEN,NUGET,COMPOSER]
 */
async function getVulnerability(package, ecosystem) {
    let octokit = new github.GitHub(core.getInput('GITHUB_TOKEN'));
    let query = ` 
    query { 
        securityVulnerabilities(ecosystem: MAVEN, first:1, package:"com.hotels.styx:styx-api") {
            nodes {
                firstPatchedVersion { identifier },
                severity,
                updatedAt,
                vulnerableVersionRange
            }
        }
    }`

    return await octokit.graphql(query, {
        headers: {
            authorization: `token ${core.getInput('GITHUB_TOKEN')}`
        }
    });
}

/*
 * Get all files from a PR
 */
async function getPrFiles(prNumber, owner, repo) {
    let octokit = new github.GitHub(core.getInput('GITHUB_TOKEN'));

    return await octokit.pulls.listFiles({
        owner: owner,
        repo: repo,
        pull_number: prNumber
    })
}

/*
 * Get a list of languages used on the repo
 */
async function getLanguageList(owner, repo) {
    let octokit = new github.GitHub(core.getInput('GITHUB_TOKEN'));

    let languageList =  await octokit.repos.listLanguages({
        owner: owner,
        repo: repo    
    })

    return languageList
}

try {
    let context = github.context

    if(context.eventName == `pull_request`){

        // getVulnerability().then(function(values) {
        //     console.log('---------------- Promise values ----------------');
        //     console.log(values.securityVulnerabilities.nodes);
        // }).catch( error => {
        //     core.setFailed(error.message);
        //     console.log(error)
        //     }
        // );
        let languagesEcosystemsInPR

        getLanguageList(context.payload.repository.owner.login, context.payload.repository.name).then( languages => {
            // Checks if the PR has commits with languages in the ecosystem
            // and creates a list with them
            languagesEcosystemsInPR = languagesEcosystems.filter(language => typeof languages[language.language] !== "undefined")
            console.log(`languagesEcosystemsInPR: ${languagesEcosystemsInPR}`)

        }).catch( error => {
            core.setFailed(error.message);
            console.log(error)
            }
        );

        getPrFiles(context.payload.number, context.payload.repository.owner.login, context.payload.repository.name).then( files => {
            console.log(`values api call: ${JSON.stringify(files)}`)
            files.forEach( function(file) {
                console.log(`Filename: ${file.filename}`)

                //Checks if dependency files were changed
                for (ecosytemFile in languagesEcosystemsInPR){
                    console.log(`ecosystem.file: ${ecosytemFile.file}`)
                    console.log(`file.filename: ${file.filename}`)
                    if(ecosytemFile.file == file.filename) {
                        console.log(`The dependency file ${file.filename} was changed`)
                    }
                }
                console.log(`-----------------------------------------------`)
            })
                

        }).catch( error => {
            core.setFailed(error.message);
            console.log(error)
            }
        );

        core.setFailed('Forcing error');

    } else {
        core.setFailed(`This action was not triggered by a Pull Request`);
    }
    
} catch (error) {
  core.setFailed(error.message);
}