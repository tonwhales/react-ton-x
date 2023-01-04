import * as React from 'react';
import { TonhubLocalConnector } from 'ton-x';
import { ConnectState, TonhubApi, TonhubConnectorNetwork } from './types';
import { useLocalConnector } from './useLocalConnector';
import { RemoteConnectPersistance, useRemoteConnector } from './useRemoteConnector';


export type TonhubConnection = { 
	state: ConnectState, 
	api: TonhubApi,
	connector: 'local' | 'remote'
};

const TonhubConnectContext = React.createContext<TonhubConnection>({ 
	state: { type: 'initing' }, 
	api: {
		requestSign: () => { throw new Error('Cannot call "requestSign" without context') },
		requestTransaction: () => { throw new Error('Cannot call "requestTransaction" without context') },
		revoke: () => { throw new Error('Cannot call "revoke" without context') },
	}, 
	connector: 'remote' 
});

export function useTonhubConnect() {
	return React.useContext(TonhubConnectContext);
}

type ProviderProps = {
	network: TonhubConnectorNetwork,
	url: string,
	name: string,
	connectionState: RemoteConnectPersistance, 
	setConnectionState: (state: (RemoteConnectPersistance | ((prevState: RemoteConnectPersistance) => RemoteConnectPersistance)), persist?: boolean) => void,
	debug?: boolean
}

export const TonhubConnectProvider = React.memo<React.PropsWithChildren<ProviderProps>>(({ children, network, url, name, connectionState, setConnectionState, debug }) => {
	const localAvailable = TonhubLocalConnector.isAvailable();

	// enable local if available, else enable remote
	const local = useLocalConnector(network, localAvailable);
	const remote = useRemoteConnector({
		network, 
		url,
		name,
		connectionState,
		setConnectionState,
		debug: !!debug
	}, !localAvailable);

	// select working connector
	const { state, api }  = localAvailable ? local! : remote!;
	if (debug) console.log(localAvailable ? '[tonhub] using local connector' : '[tonhub] using remote connector');

	const ctx = React.useMemo<TonhubConnection>(() => {
		return { state, api, connector: localAvailable ? 'local': 'remote' };
	}, [state, api]);

	return (
		<TonhubConnectContext.Provider value={ctx}>
			{children}
		</TonhubConnectContext.Provider>
	);
});