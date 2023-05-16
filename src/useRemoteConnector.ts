import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TonhubConnector, TonhubSessionState, TonhubWalletConfig } from 'ton-x';
import { RemoteConnectState, TonhubApi } from './types';
import { backoff } from './utils/time';

export type RemoteConnectPersistance = {
    type: 'initing'
} | {
    type: 'pending',
    session: string,
    link: string,
    seed: string
} | {
    type: 'online',
    session: string,
    seed: string,
    walletConfig: TonhubWalletConfig,
};

function useTonhubSession(connector: TonhubConnector | null, id: string | undefined, log: (...args: any) => void) {
	const [sessionState, setSessionState] = useState<TonhubSessionState & { id: string }>();
	useEffect(() => { 
        if (!connector) {
            log('[tonhub]: not using remote connector');
            return;
        }
		if (!id) {
			log('[tonhub]: no session');
			return;
		}
		log('[tonhub]: new session ' + id);

		let isActive = true;
		let lastUpdated: number | undefined = undefined;
		let end = () => { 
			isActive = false;
		};
		backoff(async () => {
			while (isActive) {
				let state = await connector.waitForSessionState(id, lastUpdated);
				if (state.state !== 'revoked') {
					lastUpdated = state.updated;
				}
				// in case of hook is disabled before request was got
				setSessionState((prevState) => {
					if (!isActive) {
						return prevState;
					}
					return { ...state, id: id }
				});
			}
		});
		return end;
	}, [id]);
	return sessionState;
}

export function useRemoteConnector(config: { 
	network: TonhubConnector['network'], 
	url: string, 
	name: string, 
	connectionState: RemoteConnectPersistance, 
	setConnectionState: (state: (RemoteConnectPersistance | ((prevState: RemoteConnectPersistance) => RemoteConnectPersistance))) => void,
	debug: boolean
}, active: boolean): { api: TonhubApi, state: RemoteConnectState } | null {
	const log = (...args: any) => config.debug && console.log(...args);
    const connector = useMemo(() => {
        if (active) return new TonhubConnector({ network: config.network });
        return null;
    }, [active]);

	const { connectionState, setConnectionState } = config;
    
    // Init
	useEffect(() => {
        if (!connector) {
            return;
        }

		if (connectionState.type === 'initing' || connectionState.type === undefined) {
			backoff(async () => {
				let session = await connector.createNewSession({
					name: config.name,
					url: config.url,
				});
				setConnectionState({ type: 'pending', session: session.id, link: session.link, seed: session.seed });
			});
		}
	}, [connectionState, connector]);

	const sessionId = useMemo(() => {
        if (!connector) {
            return;
        }

		if (connectionState.type === 'initing') {
			return undefined;
		} 
		return connectionState.session;
	}, [connectionState, connector]);
	let session = useTonhubSession(connector, sessionId, log);
	
	useEffect(() => {
		if (!session || !connector) {
			return;
		}
		// store only if session revoked and ready
		if (session.state === 'revoked') {
			log('[tonhub] revoked remotely');
			setConnectionState({ type: 'initing' });
		} else if (session.state === 'ready') {
			setConnectionState((prevState) => {
				// Inconsistent state (session hook in transition, ignore)
				if (prevState.type === 'initing' || session?.state !== 'ready') {
					return prevState;
				}
				if (prevState.session !== session.id) {
					return prevState;
				}

				// States are equal
				if (prevState.type === 'online' && session.id === prevState.session) {
					return prevState;
				}

				return {
					type: 'online',
					seed: prevState.seed,
					session: prevState.session,
					walletConfig: session.wallet,
				};
			});
		}
	}, [session]);

	const revoke: TonhubApi['revoke'] = useCallback(() => {
		if (!connector) {
			throw new Error('No active tonhub connector');
		}

		log('[tonhub]: revoked by user');
		if (connectionState.type === 'online') {
			backoff(async () => {
				await axios.post(
					'https://connect.tonhubapi.com/connect/revoke', { 
						key: connectionState.session 
					}, { timeout: 5000 }
				);
			});
		}

        setConnectionState({ type: 'initing' });
	}, [connector, connectionState.type]);
    const requestSign: TonhubApi['requestSign'] = useCallback((request) => {
        if (!connector) {
            throw new Error('No active tonhub connector');
        }
        if (connectionState.type !== 'online') {
            throw new Error('No active tonhub session');
        }

        return connector!.requestSign({
            appPublicKey: connectionState.walletConfig.appPublicKey,
            seed: connectionState.seed,
            timeout: 300000,
            payload: request.payload,
            text: request.text
        });
    }, [connector, connectionState.type]);
    const requestTransaction: TonhubApi['requestTransaction'] =  useCallback((request) => {
        if (!connector) {
            throw new Error('No active tonhub connector');
        }
        if (connectionState.type !== 'online') {
            throw new Error('No active tonhub session');
        }

        return connector!.requestTransaction({
            appPublicKey: connectionState.walletConfig.appPublicKey,
            seed: connectionState.seed,
            timeout: 300000,
            payload: request.payload,
            text: request.text,
            to: request.to,
            value: request.value,
            stateInit: request.stateInit
        });
    }, [connector, connectionState.type]);

	// Use memo to avoid re-renders
	const state = useMemo(() => {
		return connectionState.type === 'online' ? {
			...connectionState,
			address: connectionState.walletConfig.address,
		} : connectionState;
	}, [connectionState]);

	const api = useMemo(() => {
		return {
            requestSign,
            requestTransaction,
            revoke
        };
	}, [revoke, requestSign, requestTransaction]);

    return {
        api,
        state
    }
}