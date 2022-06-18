const simpleGit = require('simple-git');
const colors = require('colors');
const prompts = require('prompts');

class Upgrader {
  constructor() {
    const options = {
      baseDir: process.env.GLADYS_DIR,
    };
    this.git = simpleGit(options);
  }

  async run() {
    await this.git.checkIsRepo();
    await this.git.fetch('upstream', 'master');

    await this.rebase('oauth2-server', 'master', 'upstream');
    await this.rebase('google-actions-service', 'oauth2-server');

    await this.rebase('awox-service', 'master', 'upstream');
    await this.rebase('google-actions-television', 'master', 'upstream');

    await this.buildMyApp();
  }

  async rebase(ontoBranch, fromBranch, remote) {
    await this.upgrade(true, ontoBranch, fromBranch, remote);
    return this.push(ontoBranch);
  }

  async merge(ontoBranch, fromBranch, remote) {
    return this.upgrade(false, ontoBranch, fromBranch, remote);
  }

  async upgrade(rebase, ontoBranch, fromBranch, remote = 'origin') {
    console.log(colors.gray(` > Chekcout ${ontoBranch}...`));
    await this.git.checkout(ontoBranch);

    try {
      console.log(colors.gray(`   > Acting on ${ontoBranch} branch...`));
      await this.git.pull(remote, fromBranch, { '--rebase': rebase, '--quiet': true });
    } catch (e) {
      await this.checkSummary();
    }
  }

  async push(branch) {
    const { ahead, behind } = await this.git.status();
    if (ahead !== 0 && behind !== 0) {
      console.log(colors.gray(`   > Push ${branch} branch`));
      await this.git.push(['--force']);
      console.log(colors.green(`   > ${branch} branch is up-to-date`));
    } else {
      console.log(colors.green(`   > ${branch} branch is already up-to-date`));
    }
  }

  async checkSummary() {
    const { changed, files } = await this.git.diffSummary();
    if (changed !== 0) {
    }
    console.log(colors.gray(`   > ${changed} pending file(s):`));
    files.forEach((file) => {
      console.log(colors.gray(`     - ${file.file}`));
    });

    const { merged } = await prompts([
      {
        type: 'confirm',
        name: 'merged',
        initial: true,
        message: 'Some conflicts are waiting for you, did you fix them?',
      },
    ]);

    if (!merged) {
      if (rebase) {
        await this.git.rebase({ '--abort': true });
      } else {
        await this.git.merge({ '--abort': true });
      }

      console.log(colors.red.bold('Aborting process...'));
      process.exit(1);
    }
  }

  async buildMyApp() {
    await this.git.checkout('atrovato-version');
    await this.git.reset('hard', ['upstream/master']);

    await this.merge('atrovato-version', 'google-actions-service');
    await this.merge('atrovato-version', 'awox-service');
    await this.merge('atrovato-version', 'broadlink');
    await this.merge('atrovato-version', 'google-actions-television');
    await this.push('atrovato-version');
  }
}

module.exports = Upgrader;
