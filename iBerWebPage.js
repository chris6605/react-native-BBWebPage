'use strict';

import React from 'react';

import {
    Platform,
    StyleSheet,
    Text,
    Image,
    View,
    TouchableOpacity,
    WebView,
    Animated,
    Easing,
    ActivityIndicator
} from 'react-native';

import { iBer, BasePage, Navbar, RouterManager, SvgUri, AppConst } from 'react-native-iber-common';

import { ApiConst, CacheApi } from 'react-native-iber-serverapi';

import { PageRouter } from '../PageRouter';

import PngMap from '../resource/PngMap';

import SvgMap from '../resource/SvgMap';

/**
 * 只用來做一個加載 webview 的 page 
 * 接受參數:
 * title  
 * url
 * 可以前進和後退 有加載失敗 重新加載 
 * 帶 onMessage 功能的用 webview去實現 這個 page 不涉及邏輯交互和 H5通信
 */

export default class iBerWebPage extends BasePage {

    path = new Animated.Value(0)
    path1 = new Animated.Value(1)
    path2 = new Animated.Value(0)
    params = {
        ...this._getProps()
    }

    headers = {
        'device-id': global.deviceInfo ? global.deviceInfo.device_id : '',
        'version': global.deviceInfo ? global.deviceInfo.version : '',
        'version-id': global.deviceInfo ? global.deviceInfo.version_id : '',
        'os': Platform.OS,
        'uid': global.user ? global.user.uid : '',
        'token': global.user ? global.user.token : ''
    }

    constructor(props) {
        super(props);
        this.state = {
            navTitle: this.params.title || '',
            url: this.params.url || '',
            canGoForward: false,
            canGoBack: false,
            refreshing: true,
            showIndicator: true,
            loadEnd: false
        }
    }

    pageStart() {
        this.loadingAnimate()
        this.progressAnimate()
    }

    loadingAnimate() {
        this.timer = setTimeout(() => {
            Animated.timing(this.path1, {
                toValue: 0,
                duration: 300,
            }).start();
        }, 1000);
    }

    progressAnimate() {
        Animated.timing(this.path2, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear
        }).start(() => {
            if (!this.state.loadEnd) {
                this.path2.setValue(0)
                this.progressAnimate()
            }
        });
    }


    pageEnd() {
        this.timer && clearTimeout(this.timer)
    }

    renderLoading() {
        if (this.state.showIndicator) {
            return <Animated.View style={{
                position: 'absolute', top: (AppConst._SCREEN_HEIGHT - AppConst._STATUSBAR_HEIGHT - AppConst.getSize(160)) / 2, left: (AppConst._SCREEN_WIDTH - AppConst.getSize(80)) / 2, width: AppConst.getSize(80), height: AppConst.getSize(80), justifyContent: 'center', alignItems: 'center', backgroundColor: '#333', borderRadius: 10, opacity: this.path1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1]
                })
            }}>
                <ActivityIndicator
                    style={{ width: AppConst.getSize(20), height: AppConst.getSize(20) }}
                    color='#fff'
                    animating={this.state.refreshing}
                />
                <Text style={{ fontSize: AppConst.getSize(12), marginTop: AppConst.getSize(15), color: '#fff' }}>正在加載</Text>
            </Animated.View>
        }
    }

    renderContent() {
        return <View style={styles.content}>
            {
                this.state.loadEnd ? null : <Animated.View style={{
                    transform: [{
                        translateX: this.path2.interpolate({
                            inputRange: [0, 0.01, 0.99, 1],
                            outputRange: [-AppConst._SCREEN_WIDTH, -AppConst._SCREEN_WIDTH, 0, 0]
                        })
                    }], width: AppConst._SCREEN_WIDTH, height: 2, backgroundColor: AppConst.MAIN_COLOR
                }}>
                </Animated.View>
            }
            <WebView ref={ref => this.webView = ref}
                style={{ flex: 1, width: AppConst._SCREEN_WIDTH }}
                automaticallyAdjustContentInsets={false}
                mediaPlaybackRequiresUserAction={true}
                source={{ uri: this.state.url, headers: this.headers }}
                javaScriptEnabled={true}
                dataDetectorTypes='none'
                startInLoadingState={false}
                scrollEnabled={true}
                domStorageEnabled={true}
                onNavigationStateChange={(e) => {
                    console.log(e)
                    if (!e.canGoBack && !e.canGoForward) {
                        Animated.timing(this.path, {
                            toValue: 0,
                            duration: 300,
                        }).start();
                    } else {
                        Animated.timing(this.path, {
                            toValue: 1,
                            duration: 300,
                        }).start();
                    }

                    this.setState({
                        canGoBack: e.canGoBack,
                        canGoForward: e.canGoForward,
                        navTitle: e.title ? e.title : this.params.title,
                    })

                }}
                onLoadEnd={() => {
                    this.setState({ loadEnd: true })
                }}
                renderError={this.renderErrorPage.bind(this)}
            />

            {this.renderLoading()}
            {this.renderBottomBar()}
        </View>
    }


    renderErrorPage() {
        return <View style={{ width: AppConst._SCREEN_WIDTH, height: AppConst._SCREEN_HEIGHT - AppConst._STATUSBAR_HEIGHT - 100, justifyContent: 'center', alignItems: 'center' }}>
            <SvgUri width={AppConst.getSize(80)} height={AppConst.getSize(80)} fill='#cdcdcd' source={SvgMap.load_fail} />
            <Text style={{ fontSize: AppConst.getSize(14), color: '#ccc', marginTop: 5 }}>加载失败</Text>
            <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', backgroundColor: AppConst.MAIN_COLOR, borderRadius: AppConst.getSize(6), marginTop: AppConst.getSize(100) }}
                onPress={() => {
                    this.webView.reload();
                }}>
                <Text style={{ fontSize: AppConst.getSize(14), color: '#fff', paddingHorizontal: AppConst.getSize(15), paddingVertical: AppConst.getSize(6) }}>重新加載</Text>
            </TouchableOpacity>
        </View>
    }

    renderBottomBar() {
        return <Animated.View style={{
            width: AppConst._SCREEN_WIDTH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignItems: 'center', borderTopColor: '#ccc', borderTopWidth: AppConst.ONE_PIXEL, height: this.path.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 40]
            }), backgroundColor: '#fff',
        }}>
            <TouchableOpacity style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                    this.webView.goBack()
                }}>
                <SvgUri width={AppConst.getSize(20)} height={AppConst.getSize(20)} fill={this.state.canGoBack ? '#333' : '#cdcdcd'} source={SvgMap.arrow_left_web} />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: AppConst.getSize(110), width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => {
                    this.webView.goForward()
                }}>
                <SvgUri width={AppConst.getSize(25)} height={AppConst.getSize(25)} fill={this.state.canGoForward ? '#333' : '#cdcdcd'} source={SvgMap.arrow_right_web} />
            </TouchableOpacity>


        </Animated.View>

    }

    renderNavbar() {
        return <Navbar
            title={this.state.navTitle}
            leftItems={() => { return null }}
            rightItems={() => {
                return <TouchableOpacity style={{ width: 30, height: 30, justifyContent: 'center', alignItems: 'center', marginRight: AppConst.getSize(8) }}
                    onPress={() => {
                        RouterManager.pop()
                    }}>
                    <SvgUri width={AppConst.getSize(16)} height={AppConst.getSize(16)} source={SvgMap.close} />
                </TouchableOpacity>
            }}
            bottomSplitLine={true}>
        </Navbar>
    }
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
})








