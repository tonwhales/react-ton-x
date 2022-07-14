# react-ton-x
## Usage
Wrap your root component with **TonhubConnectProvider**
```jsx
import { RemoteConnectPersistance, TonhubConnectProvider } from 'react-ton-x';

const App = () => {
    // use any persistent state you want for remote connector
    const [connectionState, setConnectionState] = useLocalStorage<RemoteConnectPersistance>('connection', { state: 'initing' });

    return (
        <TonhubConnectProvider
            network="mainnet"
            url="YOUR APP URL"
            name="YOUR APP NAME"
            debug={false}
            connectionState={connectionState}
            setConnectionState={setConnectionState}
        >
            {/* here goes your applicaton */}
        </TonhubConnectProvider>
    )
}
``` 
When use hook in any child component:
```jsx
import { useTonhubConnect } from 'react-ton-x';

const Page = () => {
    const connect = useTonhubConnect();
    if (connect.state.type === 'initing') {
        return <span>Waiting for session</span>;
    }
    if (connect.state.type === 'pending') {
        return <a href={connect.state.link}>Authorize</a>;
    }
    return (
        <>
            <span>Network: {config.network}</span>
            <span>Address: {config.address.toFriendly()}</span>
        </>
    )
}
```