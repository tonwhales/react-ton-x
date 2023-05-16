import { useCallback, useMemo } from 'react'
import { TonhubLocalConnector } from 'ton-x';
import { LocalConnectState, TonhubApi } from './types';


export function useLocalConnector(network: TonhubLocalConnector['network'], active: boolean): { api: TonhubApi, state: LocalConnectState } | null {
    const connector = useMemo(() => {
        if (active) return new TonhubLocalConnector(network);
        return null;
    }, [active]);
	
	if (!connector) {
		return null;
	}

	const revoke: TonhubApi['revoke'] = useCallback(() => {
		throw new Error('Cannot revoke local session');
	}, []);
    const requestSign: TonhubApi['requestSign'] = (request) => {
        if (!connector) {
            throw new Error('No active tonhub connector');
        }

        return connector!.requestSign({
            payload: request.payload,
            text: request.text
        });
    }
    const requestTransaction: TonhubApi['requestTransaction'] = (request) => {
        if (!connector) {
            throw new Error('No active tonhub connector');
        }

        return connector!.requestTransaction({
            payload: request.payload,
            text: request.text,
            to: request.to,
            value: request.value,
            stateInit: request.stateInit
        });
    }

    return {
        api: {
            requestSign,
            requestTransaction,
            revoke
        },
        state: { type: 'online', address: connector!.config.address, walletConfig: connector!.config }
    }
}