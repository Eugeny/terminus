import { Injectable } from '@angular/core'
import { ProfileProvider, NewTabParameters, PartialProfile } from 'tabby-core'
import { SSHProfileSettingsComponent } from './components/sshProfileSettings.component'
import { SSHTabComponent } from './components/sshTab.component'
import { PasswordStorageService } from './services/passwordStorage.service'
import { ALGORITHM_BLACKLIST, SSHAlgorithmType, SSHProfile } from './api'

import * as ALGORITHMS from 'ssh2/lib/protocol/constants'

@Injectable({ providedIn: 'root' })
export class SSHProfilesService extends ProfileProvider<SSHProfile> {
    id = 'ssh'
    name = 'SSH'
    supportsQuickConnect = true
    settingsComponent = SSHProfileSettingsComponent
    configDefaults = {
        options: {
            host: null,
            port: 22,
            user: 'root',
            auth: null,
            password: null,
            privateKeys: [],
            keepaliveInterval: null,
            keepaliveCountMax: null,
            readyTimeout: null,
            x11: false,
            skipBanner: false,
            jumpHost: null,
            agentForward: false,
            warnOnClose: null,
            algorithms: {
                hmac: [],
                kex: [],
                cipher: [],
                serverHostKey: [],
            },
            proxyCommand: null,
            forwardedPorts: [],
            scripts: [],
        },
    }

    supportedAlgorithms: Record<string, string> = {}

    constructor (
        private passwordStorage: PasswordStorageService
    ) {
        super()
        for (const k of Object.values(SSHAlgorithmType)) {
            const supportedAlg = {
                [SSHAlgorithmType.KEX]: 'SUPPORTED_KEX',
                [SSHAlgorithmType.HOSTKEY]: 'SUPPORTED_SERVER_HOST_KEY',
                [SSHAlgorithmType.CIPHER]: 'SUPPORTED_CIPHER',
                [SSHAlgorithmType.HMAC]: 'SUPPORTED_MAC',
            }[k]
            const defaultAlg = {
                [SSHAlgorithmType.KEX]: 'DEFAULT_KEX',
                [SSHAlgorithmType.HOSTKEY]: 'DEFAULT_SERVER_HOST_KEY',
                [SSHAlgorithmType.CIPHER]: 'DEFAULT_CIPHER',
                [SSHAlgorithmType.HMAC]: 'DEFAULT_MAC',
            }[k]
            this.supportedAlgorithms[k] = ALGORITHMS[supportedAlg].filter(x => !ALGORITHM_BLACKLIST.includes(x)).sort()
            this.configDefaults.options.algorithms[k] = ALGORITHMS[defaultAlg].filter(x => !ALGORITHM_BLACKLIST.includes(x))
            this.configDefaults.options.algorithms[k].sort()
        }
    }

    async getBuiltinProfiles (): Promise<PartialProfile<SSHProfile>[]> {
        return [{
            id: `ssh:template`,
            type: 'ssh',
            name: 'SSH connection',
            icon: 'fas fa-desktop',
            options: {
                host: '',
                port: 22,
                user: 'root',
            },
            isBuiltin: true,
            isTemplate: true,
            weight: -1,
        }]
    }

    async getNewTabParameters (profile: PartialProfile<SSHProfile>): Promise<NewTabParameters<SSHTabComponent>> {
        return {
            type: SSHTabComponent,
            inputs: { profile },
        }
    }

    getDescription (profile: PartialProfile<SSHProfile>): string {
        return profile.options?.host ?? ''
    }

    deleteProfile (profile: SSHProfile): void {
        this.passwordStorage.deletePassword(profile)
    }

    quickConnect (query: string): PartialProfile<SSHProfile> {
        let user = 'root'
        let host = query
        let port = 22
        if (host.includes('@')) {
            const parts = host.split(/@/g)
            host = parts[parts.length - 1]
            user = parts.slice(0, parts.length - 1).join('@')
        }
        if (host.includes('[')) {
            port = parseInt(host.split(']')[1].substring(1))
            host = host.split(']')[0].substring(1)
        } else if (host.includes(':')) {
            port = parseInt(host.split(/:/g)[1])
            host = host.split(':')[0]
        }

        return {
            name: query,
            type: 'ssh',
            options: {
                host,
                user,
                port,
            },
        }
    }
}
