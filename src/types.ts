import { Address } from 'ton';
import { TonhubLocalTransactionResponse, TonhubSignResponse, TonhubTransactionResponse, TonhubWalletConfig } from 'ton-x';
import { TonhubLocalConfig, TonhubLocalConnector, TonhubLocalSignResponse } from 'ton-x/dist/connector/TonhubLocalConnector';

export type TransactionRequest = {
	to: string;
    value: string;
    stateInit?: string | null | undefined;
    text?: string | null | undefined;
    payload?: string | null | undefined;
}
type TransactionResponse = TonhubLocalTransactionResponse | TonhubTransactionResponse;

export type SignRequest = {
	text?: string | null | undefined;
    payload?: string | null | undefined;
}
export type SignResponse = TonhubLocalSignResponse | TonhubSignResponse;

export type TonhubApi = {
	requestTransaction: (request: TransactionRequest) => Promise<TransactionResponse>
    requestSign: (request: SignRequest) => Promise<SignResponse>
	revoke: () => void,
}

export type RemoteConnectState = {
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
    address: Address
};
export type LocalConnectState = {
	type: 'online',
    walletConfig: TonhubLocalConfig,
    address: Address
};

export type ConnectState = RemoteConnectState | LocalConnectState;

export type TonhubConnectorNetwork = TonhubLocalConnector['network'];
