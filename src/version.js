class Version {
    constructor(versionString) {
        [this.major, this.minor, this.patch] = versionString.split('.').map(n => +n);
    }

    bigger(otherVersion) {
        if (this.major !== otherVersion.major) {
            return this.major > otherVersion.major;
        }
        if (this.minor !== otherVersion.minor) {
            return this.minor > otherVersion.minor;
        }
        return this.patch > otherVersion.patch;
    }

    max(otherVersion) {
        if (this.bigger(otherVersion)) {
            return this;
        }
        return otherVersion;
    }

    toString() {
        return [this.major, this.minor, this.patch].join('.');
    }
}
module.exports = Version;
