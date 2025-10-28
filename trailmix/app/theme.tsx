import { StyleSheet } from 'react-native';

export const theme = {
    colors: {
        primary: {
            dark: '#29361B',
            medium: '#455429',
            light: '#617337',
        },
        secondary: {
            dark: '#BB6C29',
            medium: '#DEA15E',
            light: '#FCFAE1',
        },
        gradient: {
            lightgreen: ['#617337', '#455429'] as const,
            darkgreen: ['#455429', '#29361B'] as const,
            lightbrown: ['#FCFAE1', '#DEA15E'] as const,
            darkbrown: ['#DEA15E', '#BB6C29'] as const,
        },
        neutrallight: {
            white: '#FFFFFF',
            lightgray: '#E4E3E4',
            gray: '#C8C7C8',
        },
        neutraldark: {
            light: '#918F90',
            medium: '#5A5758',
            black: '#231F20',
        },
        support: {
            success: '#3186A3',
            warning: '#D76600',
            error: '#BC2B18',
        },
    },
    typography: {
        heading: {
            h1: {
                fontSize: 24,
                fontWeight: '800', // "Extra bold"
                lineHeight: 28,
            },
            h2: {
                fontSize: 18,
                fontWeight: '800',
                lineHeight: 22,
            },
            h3: {
                fontSize: 16,
                fontWeight: '800',
                lineHeight: 20,
            },
            h4: {
                fontSize: 14,
                fontWeight: '700', // "Bold"
                lineHeight: 18,
            },
            h5: {
                fontSize: 12,
                fontWeight: '700',
                lineHeight: 16,
            },
        },

        body: {
            xl: {
                fontSize: 18,
                fontWeight: '400', // "Regular"
                lineHeight: 24,
            },
            l: {
                fontSize: 16,
                fontWeight: '400',
                lineHeight: 22,
            },
            m: {
                fontSize: 14,
                fontWeight: '400',
                lineHeight: 18,
            },
            s: {
                fontSize: 12,
                fontWeight: '400',
                lineHeight: 16,
            },
            xs: {
                fontSize: 10,
                fontWeight: '500', // "Medium"
                lineHeight: 12,
            },
        },

        action: {
            l: {
                fontSize: 14,
                fontWeight: '600', // "Semi Bold"
                lineHeight: 16,
                textTransform: 'uppercase',
            },
            m: {
                fontSize: 12,
                fontWeight: '600',
                lineHeight: 14,
                textTransform: 'uppercase',
            },
            s: {
                fontSize: 10,
                fontWeight: '600',
                lineHeight: 12,
                textTransform: 'uppercase',
            },
        },

        caption: {
            m: {
                fontSize: 10,
                fontWeight: '600', // Semi Bold
                lineHeight: 12,
            },
        },
    },
    container: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: 'theme.colors.secondary.light',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    form: {
        flex: 1,
        justifyContent: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'white',
        fontSize: 16,
    },
    buttonContainer: {
        gap: 10,
        marginTop: 20,
    },
    errorText: {
        color: '#e74c3c',
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 14,
    },
    loader: {
        marginTop: 20,
    },
    footerText: {
        color: '#7f8c8d',
        textAlign: 'center',
        fontSize: 12,
        marginBottom: 20,
    },
    // Landing page styles
    landing: {
        container: {
            flex: 1,
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 40,
            flexDirection: 'column',
            justifyContent: 'space-between',
        },
        topSection: {
            alignItems: 'center',
        },
        title: {
            fontSize: 40,
            fontWeight: '700',
            color: '#FCFAE1',
        },
        subtitle: {
            fontSize: 16,
            color: '#ffffff99',
            textAlign: 'center',
            marginTop: 8,
        },
        buttonSection: {
            alignItems: 'center',
        },
        buttonContainer: {
            width: '100%',
            maxWidth: 400,
            alignSelf: 'center',
            gap: 16,
        },
        landingButton: {
            width: '100%',
        },
    },
    // Button styles
    buttons: {
        baseButton: {
            borderRadius: 40,
            paddingVertical: 18,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        primaryButton: {
            backgroundColor: '#FCFAE1',
        },
        secondaryButton: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: '#FCFAE1',
        },
        primaryButtonText: {
            color: '#29361B',
            fontSize: 16,
            fontWeight: '600',
        },
        secondaryButtonText: {
            color: '#FCFAE1',
            fontSize: 16,
            fontWeight: '600',
        },
    },
}

// Create StyleSheet for better performance
export const styles = StyleSheet.create({
    
    // Landing page styles
    landingContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    landingTopSection: {
        alignItems: 'center',
    },
    landingTitle: {
        fontSize: 40,
        fontWeight: '700',
        color: '#FCFAE1',
    },
    landingSubtitle: {
        fontSize: 16,
        color: '#ffffff99',
        textAlign: 'center',
        marginTop: 8,
    },
    landingButtonSection: {
        alignItems: 'center',
    },
    landingButtonContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
        gap: 16,
    },
    landingButton: {
        width: '100%',
    },
    
    // Auth pages styles (sign-up, sign-in)
    authContainer: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    authHeader: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    authTitle: {
        fontSize: 48,
        fontWeight: '700',
        color: '#FCFAE1',
        marginBottom: 8,
    },
    authSubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    authForm: {
        flex: 1,
        justifyContent: 'center',
    },
    authInput: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 15,
        color: theme.colors.secondary.light,
        marginBottom: 15,
        borderColor: theme.colors.secondary.light,
        fontSize: 16,
    },
    authButtonContainer: {
        gap: 10,
        marginTop: 20,
    },
    authFooterText: {
        color: '#7f8c8d',
        textAlign: 'center',
        fontSize: 12,
        marginBottom: 20,
    },
    
    // Main app home page styles
    homeContainer: {
        flex: 1,
        padding: 24,
        backgroundColor: '#f5f5f5',
    },
    homeHeader: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 60,
    },
    homeTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: 8,
    },
    homeSubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    homeUserInfo: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    homeStatusText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#27ae60',
        marginBottom: 8,
    },
    homeEmailText: {
        fontSize: 16,
        color: '#2c3e50',
        marginBottom: 4,
    },
    homeUserIdText: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    homeActions: {
        marginTop: 'auto',
    },
    
    // Modal styles
    modalContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalLink: {
        marginTop: 15,
        paddingVertical: 15,
    },
    
    // Explore page styles
    exploreHeaderImage: {
        color: '#808080',
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    exploreTitleContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    
    // Index page styles
    indexTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    indexStepContainer: {
        gap: 8,
        marginBottom: 8,
    },
    indexReactLogo: {
        height: 178,
        width: 290,
        bottom: 0,
        left: 0,
        position: 'absolute',
    },
    
    // Button styles
    baseButton: {
        borderRadius: 40,
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: '#FCFAE1',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#FCFAE1',
    },
    primaryButtonText: {
        color: '#29361B',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButtonText: {
        color: '#FCFAE1',
        fontSize: 16,
        fontWeight: '600',
    },
    
    // Common styles
    errorText: {
        color: '#e74c3c',
        textAlign: 'center',
        marginBottom: 10,
        fontSize: 14,
    },
    loader: {
        marginTop: 20,
    },
});