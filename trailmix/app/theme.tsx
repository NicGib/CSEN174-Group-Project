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
<<<<<<< HEAD
    
    // Component Styles
    components: {
        container: {
            flex: 1,
            padding: 24,
            backgroundColor: '#f5f5f5',
        },
        header: {
            alignItems: 'center' as const,
            marginBottom: 40,
            marginTop: 60,
        },
        title: {
            fontSize: 48,
            fontWeight: '700' as const,
            color: '#FCFAE1', // secondary.light
            marginBottom: 8,
        },
        titleWhite: {
            fontSize: 48,
            fontWeight: '700' as const,
            color: '#FFFFFF', // white override
            marginBottom: 8,
        },
        titleMain: {
            fontSize: 28,
            fontWeight: '700' as const,
            color: '#2c3e50',
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            color: '#7f8c8d',
            textAlign: 'center' as const,
        },
        form: {
            flex: 1,
            justifyContent: 'center' as const,
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
        buttonContainerBottom: {
            gap: 10,
            marginTop: 'auto' as const,
            marginBottom: 20,
        },
        errorText: {
            color: '#e74c3c',
            textAlign: 'center' as const,
            marginBottom: 10,
            fontSize: 14,
        },
        loader: {
            marginTop: 20,
        },
        footerText: {
            color: '#7f8c8d',
            textAlign: 'center' as const,
            fontSize: 12,
            marginBottom: 10,
        },
        
        // Button Styles
        baseButton: {
            width: '100%' as const,
            borderRadius: 40,
            paddingVertical: 18,
            paddingHorizontal: 24,
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
        },
        primaryButton: {
            backgroundColor: '#FCFAE1', // secondary.light
        },
        secondaryButton: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: '#FCFAE1', // secondary.light
        },
        primaryButtonText: {
            color: '#29361B', // primary.dark
            fontSize: 16,
            fontWeight: '600' as const,
        },
        secondaryButtonText: {
            color: '#FCFAE1', // secondary.light
            fontSize: 16,
            fontWeight: '600' as const,
        },
        
        // Card Styles
        card: {
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
        
        // Text Styles
        statusText: {
            fontSize: 18,
            fontWeight: '600' as const,
            color: '#27ae60',
            marginBottom: 8,
        },
        emailText: {
            fontSize: 16,
            color: '#2c3e50',
            marginBottom: 4,
        },
        userIdText: {
            fontSize: 14,
            color: '#7f8c8d',
        },
        
        // Layout Styles
        actions: {
            marginTop: 'auto',
        },
=======
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
>>>>>>> main
    },
}