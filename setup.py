# -*- coding: utf-8 -*-
"""Installer for the volto.formsupport.dataexport package."""
from setuptools import find_packages
from setuptools import setup


long_description = "\n\n".join(
    [
        open("README.rst").read(),
        open("CONTRIBUTORS.rst").read(),
        open("CHANGES.rst").read(),
    ]
)


setup(
    name="volto.formsupport.dataexport",
    version="1.2.0",
    description="Plone REST API proxy endpoint (@form-export-api) for volto-form-block-data-export.",
    long_description=long_description,
    classifiers=[
        "Environment :: Web Environment",
        "Framework :: Plone",
        "Framework :: Plone :: Addon",
        "Framework :: Plone :: 6.0",
        "Framework :: Plone :: 6.1",
        "Framework :: Plone :: 6.2",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
        "Operating System :: OS Independent",
        "License :: OSI Approved :: MIT License",
    ],
    keywords="Python Plone CMS Volto Form Data Export REST API",
    author="Ramon Nunez",
    author_email="rnunez@york.cuny.edu",
    url="https://github.com/rnunez80/volto.formsupport.dataexport",
    project_urls={
        "PyPI": "https://pypi.org/project/volto.formsupport.dataexport/",
        "Source": "https://github.com/rnunez80/volto.formsupport.dataexport",
        "Tracker": "https://github.com/rnunez80/volto.formsupport.dataexport/issues",
    },
    license="MIT",
    packages=find_packages("src", exclude=["ez_setup"]),
    namespace_packages=["volto", "volto.formsupport"],
    package_dir={"": "src"},
    include_package_data=True,
    zip_safe=False,
    python_requires=">=3.8",
    install_requires=[
        "setuptools",
        "Plone",
        "plone.api>=1.8.4",
        "plone.restapi",
        "requests",
    ],
    extras_require={
        "test": [
            "plone.app.testing",
            "plone.testing>=5.0.0",
            "plone.restapi[test]",
            "pytest",
            "pytest-plone",
            "requests-mock",
        ],
    },
    entry_points="""
    [z3c.autoinclude.plugin]
    target = plone
    [plone.autoinclude.plugin]
    target = plone
    """,
)
