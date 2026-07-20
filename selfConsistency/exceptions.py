from schema import ProviderResult


class AllProvidersFailedException(Exception):
    def __init__(self, results: list[ProviderResult]):
        self.results = results
        super().__init__("All model providers failed")
