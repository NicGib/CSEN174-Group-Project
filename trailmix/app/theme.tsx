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
}